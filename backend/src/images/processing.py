"""Bounded decode and pixel-only re-encoding; no source metadata is forwarded."""

from dataclasses import dataclass
from io import BytesIO
import warnings
from threading import BoundedSemaphore

from PIL import Image, ImageOps, UnidentifiedImageError

from shared.errors import ValidationFailedError
from .storage import PosterUnavailableError

MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 25_000_000
MAX_EDGE = 2048
CONTENT_TYPES = ('image/jpeg', 'image/png', 'image/webp')
FORMATS = {'JPEG': 'image/jpeg', 'PNG': 'image/png', 'WEBP': 'image/webp'}
_DECODERS = BoundedSemaphore(2)


@dataclass(frozen=True)
class ProcessedImage:
    data: bytes
    content_type: str
    width: int
    height: int


def process_image(data: bytes, content_type: str, file_size: int) -> ProcessedImage:
    if not _DECODERS.acquire(blocking=False):
        raise PosterUnavailableError('poster processing is busy; retry completion shortly')
    try:
        return _process_image(data, content_type, file_size)
    finally:
        _DECODERS.release()


def _process_image(data: bytes, content_type: str, file_size: int) -> ProcessedImage:
    if not data or len(data) > MAX_BYTES or len(data) != file_size:
        raise ValidationFailedError('poster bytes do not match the declared size or exceed 10 MiB')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as source:
                if FORMATS.get(source.format) != content_type:
                    raise ValidationFailedError('poster format does not match contentType')
                if source.width * source.height > MAX_PIXELS:
                    raise ValidationFailedError('poster exceeds 25 megapixels')
                if getattr(source, 'n_frames', 1) != 1:
                    raise ValidationFailedError('animated posters are unsupported')
                source.load()
                ImageOps.exif_transpose(source, in_place=True)
                alpha = 'A' in source.getbands() or 'transparency' in source.info
                source.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
                pixels = source.convert('RGBA' if alpha else 'RGB')
                # A fresh image discards EXIF, ICC, PNG text and decoder-specific info.
                clean = Image.new(pixels.mode, pixels.size)
                clean.paste(pixels)
                output = BytesIO()
                clean.save(output, format='PNG' if alpha else 'JPEG', **(
                    {} if alpha else {'quality': 88, 'optimize': True}
                ))
                return ProcessedImage(
                    output.getvalue(), 'image/png' if alpha else 'image/jpeg',
                    clean.width, clean.height,
                )
    except (
        UnidentifiedImageError, OSError, ValueError,
        Image.DecompressionBombError, Image.DecompressionBombWarning,
    ) as exc:
        raise ValidationFailedError('poster is malformed, unsupported or too large to decode') from exc
