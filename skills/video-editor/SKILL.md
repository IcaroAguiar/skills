---
name: video-editor
description: >-
  Use when asked to edit or create a video from photos, clips and music: "faz um vídeo com nossas fotos", "monta um reel/clipe", "edita esse vídeo", "vídeo de aniversário/homenagem/viagem", "no estilo das trends do CapCut". Researches references, gathers media (Fotos/iCloud, YouTube audio), cuts on the beat and renders a vertical MP4 with ffmpeg. Demo of a code change: pr-demo-video.
---

# Video editor

Goal: a vertical video the user would post, cut on the music, where every frame shows the right people well framed. "Simple" is the failure the user names first; a slideshow with fades is not this skill.

Scripts live in `scripts/` next to this file. Run Python through `uv run -q --python 3.12 --with <deps>`; renders and Whisper are memory-heavy, so run one at a time. Deps: montage `pillow numpy opencv-python-headless==4.10.0.84 pyobjc-framework-Vision pyobjc-framework-Quartz` (the version the scripts were tested with); audio `librosa faster-whisper soundfile`; photo picking `osxphotos` (`uv tool install osxphotos`).

## Steps

1. **References first.** Search current edits for the occasion (`WebSearch`: "<ocasião> edit trend CapCut <ano>", CapCut template pages) and list the techniques you will use before touching media. Done when you can name at least four, each mapped to a moment of the song. Skipping this produced a "simples demais" first cut.
2. **Media.** Photos of a person: `scripts/pick_photos.py <Pessoa> uuids.txt [--with "Outra Pessoa"]`, then export (see *Fotos do iCloud*). Pull the Live Photos and videos too: real motion is what lifts the edit. Audio the user names: `uvx --from "yt-dlp[default]@latest" yt-dlp "ytsearch5:<música> <artista>" --flat-playlist --print "%(id)s | %(title)s | %(duration)s" --js-runtimes node`, pick the studio track over a medley, then `-x --audio-format mp3`. Done when the files are local and you have looked at a `scripts/sheet.py images` sheet of them.
3. **Curate.** From the sheets, keep frames where the subjects are the focus. Drop prints, near-duplicates, group shots where others lead, and shots a 9:16 crop will cut. Order chronologically. Done when every kept photo would pass the step 6 check.
4. **Audio map.** `scripts/audio.py musica.mp3 <dir> --lyrics-from <s> --lyrics-to <s> --prompt "<trecho da letra>"` gives beats and per-word times. Mark intro, build ("segura, vamo!"-type lead-in), drop (chorus entry), holds (lines to linger on) and the fast tail. Done when every mark is a time in seconds.
5. **Edit.** Write `edit.json` ([`references/edit-json.md`](references/edit-json.md)) and run `scripts/montage.py edit.json preview.mp4 --preview`; it also writes `<workdir>/segs.json`.
6. **Frame-by-frame check.** `scripts/sheet.py segments preview.mp4 <workdir>/segs.json sheet.jpg` and read every sheet. Done when no cut shows a stranger in focus, a cut-off head or partner, overflowing text, or a repeated photo back to back. Fix through `edit.json` or the photo list and re-render the preview.
7. **Final.** Render without `--preview` to the user's Desktop, check `ffprobe` bit rate ≈ 10 Mbps, open it, and say what is in it moment by moment. Delete earlier versions only when the user asks.

## Techniques in montage.py

- **Parallax 3D**: macOS Vision person segmentation splits subject and background; background is inpainted and blurred, layers zoom at different speeds.
- **Velocity**: clips ramp slow→fast→slow inside each beat; holds play at half speed.
- **Hits**: zoom blur into each cut, shake, RGB split on build and fast tail, white flash on the drop and strong beats, whip pan every few cuts.
- **Kinetic lyrics**: each word rises in at its sung time, shrinking to fit 90% width.
- **Counter intro** (days together, etc.) over a fast photo flashback; **end card** revealed line by line; film grade, grain, vignette, light leaks.
- **Wide shots** (aspect > 0.85 whose people span the crop) become a full card over a blurred copy, so nobody is cut.

## Fotos do iCloud

An agent's sandboxed shell usually lacks Photos permission, and `--download-missing` hangs or fails silently there. Write the `osxphotos export <dir> --uuid-from-file uuids.txt --download-missing --use-photokit --convert-to-jpeg --filename "{created.strftime,%Y%m%d_%H%M%S}_{uuid}" --update` command into a `.command` file that ends with `echo $? > <dir>.exit`, launch it with `open -a Terminal`, and wait on the `.exit` file. If it fails, open `x-apple.systempreferences:com.apple.preference.security?Privacy_Photos` and ask the user to enable Terminal. iCloud downloads one item at a time: ~100 photos take 10–20 min. Live Photos export as a `.mov` beside the `.jpg`; filter by extension.

## Gotchas

- **Bit rate.** Per-frame grain defeats compression: CRF output reached 50 Mbps and stuttered on playback. `montage.py` encodes at 10 Mbps / max 14 Mbps; keep it.
- ffmpeg from Homebrew here has no `drawtext`; all text is drawn with Pillow (`Didot.ttc` index 1 italic, `Avenir Next.ttc` index 5 for caps).
- `cv2`/Pillow ignore EXIF until `ImageOps.exif_transpose`; sheets without it show rotated photos.
- People tagged in Fotos often start years after the relationship did; say which years are missing and ask for an album.
- A caption or message in the user's voice belongs to `whatsapp-voice`; offer options grounded only in facts from the material.
