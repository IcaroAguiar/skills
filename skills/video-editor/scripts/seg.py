import os, sys, tempfile, Vision, Quartz, numpy as np
from Foundation import NSURL
from PIL import Image, ImageOps
def mask(path):
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB'); im.thumbnail((1600,1600))
    fd, tmp = tempfile.mkstemp(suffix='.png'); os.close(fd); im.save(tmp)
    req = Vision.VNGeneratePersonSegmentationRequest.alloc().initWithCompletionHandler_(None)
    req.setQualityLevel_(0)  # accurate
    h = Vision.VNImageRequestHandler.alloc().initWithURL_options_(NSURL.fileURLWithPath_(tmp), None)
    ok, err = h.performRequests_error_([req], None)
    os.remove(tmp)
    if not ok or not req.results(): raise RuntimeError(f'Vision não segmentou {path}: {err}')
    pb = req.results()[0].pixelBuffer()
    Quartz.CVPixelBufferLockBaseAddress(pb, 0)
    w, hh = Quartz.CVPixelBufferGetWidth(pb), Quartz.CVPixelBufferGetHeight(pb)
    bpr = Quartz.CVPixelBufferGetBytesPerRow(pb)
    buf = Quartz.CVPixelBufferGetBaseAddress(pb).as_buffer(bpr * hh)
    a = np.frombuffer(buf, np.uint8).reshape(hh, bpr)[:, :w].copy()
    Quartz.CVPixelBufferUnlockBaseAddress(pb, 0)
    m = Image.fromarray(a).resize(im.size, Image.BILINEAR)
    return im, m
if __name__ == '__main__':
    im, m = mask(sys.argv[1]); m.save(sys.argv[2]); print(im.size, np.asarray(m).mean())
