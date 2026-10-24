#!/usr/bin/env python3
"""Post-process the main-page recording named by the current report."""
import json
from pathlib import Path
import subprocess
import sys


def main():
    run = Path(sys.argv[1])
    report = json.loads((run / 'report.json').read_text())
    video = report.get('video')
    if not video or not Path(video).is_file():
        raise RuntimeError('Report has no main-page recording')
    out = run / 'out'
    out.mkdir(exist_ok=True)
    mp4 = out / 'demo.mp4'

    def ffmpeg(*args):
        # Only fixed diagnostics reach the terminal, never ffmpeg's source paths.
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *map(str, args)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def frame(target, *args):
        target.unlink(missing_ok=True)
        ffmpeg(*args, target)
        if not target.is_file() or target.stat().st_size == 0:
            raise RuntimeError('An expected frame was not produced')

    ffmpeg('-i', video, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24',
           '-preset', 'medium', '-movflags', '+faststart', mp4)
    frame(out / 'sheet.png', '-i', mp4, '-vf', 'fps=1/6,scale=640:-1,tile=4x6', '-frames:v', '1')
    for scene in report['scenes']:
        if scene['status'] == 'skipped':
            continue
        scene_id = scene['id']
        if not scene_id or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-' for c in scene_id):
            raise RuntimeError('Invalid scene id')
        for label, seconds in [('mid', (scene['startMs'] + scene['endMs']) / 2000),
                               ('end', max(scene['endMs'] / 1000 - .3, 0))]:
            frame(out / f'{scene_id}-{label}.png', '-ss', f'{seconds:.2f}', '-i', mp4, '-frames:v', '1')
    print('post: demo.mp4, sheet.png and all expected scene frames produced')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('post failed: missing recording, failed conversion or missing expected frame', file=sys.stderr)
        sys.exit(1)
