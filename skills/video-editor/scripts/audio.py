"""Batidas e letra com tempo de cada palavra.

Uso: audio.py <musica> <saida_dir> [--lyrics-from S --lyrics-to S --prompt "trecho da letra"]
Gera beats.json ({tempo, beats}) e, com --lyrics-*, words.json ([[inicio, fim, palavra]], tempos absolutos).
"""
import argparse, json, os, subprocess
ap = argparse.ArgumentParser(); ap.add_argument('music'); ap.add_argument('out')
ap.add_argument('--lyrics-from', type=float); ap.add_argument('--lyrics-to', type=float); ap.add_argument('--prompt', default='')
a = ap.parse_args()
if (a.lyrics_from is None) != (a.lyrics_to is None): ap.error('use --lyrics-from e --lyrics-to juntos')
os.makedirs(a.out, exist_ok=True)
import librosa, numpy as np
y, sr = librosa.load(a.music, sr=22050)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
json.dump({'tempo': float(np.atleast_1d(tempo)[0]), 'beats': [float(b) for b in beats]}, open(f'{a.out}/beats.json', 'w'))
print('tempo', float(np.atleast_1d(tempo)[0]), 'batidas', len(beats))
if a.lyrics_from is not None:
    import soundfile as sf
    from faster_whisper import WhisperModel
    wav = f'{a.out}/musica16k.wav'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', a.music, '-ac', '1', '-ar', '16000', wav], check=True)
    au, _ = sf.read(wav, dtype='float32')       # PyAV do faster-whisper falha com mp3: decodifica pelo ffmpeg
    au = au[int(a.lyrics_from * 16000):int(a.lyrics_to * 16000)]
    segs, _ = WhisperModel('medium', compute_type='int8').transcribe(au, language='pt', word_timestamps=True, initial_prompt=a.prompt or None)
    out = [(round(w.start + a.lyrics_from, 2), round(w.end + a.lyrics_from, 2), w.word.strip()) for s in segs for w in s.words]
    json.dump(out, open(f'{a.out}/words.json', 'w'), ensure_ascii=False)
    print(' '.join(f'{w}@{s}' for s, e, w in out))
