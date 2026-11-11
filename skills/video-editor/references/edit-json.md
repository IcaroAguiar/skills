# edit.json

Input of `scripts/montage.py`. Times are absolute seconds in the music file; `montage.py` snaps marks to the nearest beat.

```json
{
  "workdir": "/abs/work",                 // cache and segs.json land here
  "music": "/abs/musica.mp3",
  "beats": "/abs/beats.json",             // from audio.py
  "words": "/abs/words.json",             // from audio.py; omit when there are no lyrics on screen
  "audio": {"start": 33.0, "end": 87.0},  // the excerpt; end = last beat before the end card
  "tail": 3.4,                            // seconds of end card over the music fade
  "marks": {
    "intro_end": 35.0,                    // counter ends here (ignored without "counter")
    "build": 41.5,                        // one cut per beat, half-beat stutter on the last two
    "drop": 44.5,                         // white flash + hero photo, chorus pattern starts
    "holds": [[48.5, 50.6]],              // slow-motion clip lingering on a line
    "fast": 82.5                          // one cut per beat until the end
  },
  "photos": ["/abs/a.jpg", "..."],        // chronological; the first three open the intro
  "clips": [{"file": "/abs/v.mov", "start": 0.3, "dur": 2.6}],  // chronological; every third chorus cut and each hold
  "hero": "IMG_0042",                     // substring of the photo that lands on the drop
  "counter": {"value": 365, "label": "dias de viagem"},          // optional intro
  "lyrics": [
    {"show": [35.0, 37.6], "text": "primeira linha do refrão", "match": [35.3, 36.2]}
  ],
  "end_card": [
    {"text": "2026", "style": "rom", "size": 300, "y": 0.24, "delay": 0.15},
    {"text": "nossa viagem", "style": "ital", "size": 110, "y": 0.47, "delay": 0.45}
  ]
}
```

- `lyrics[].show`: when the line is on screen; either end may be `"drop"`, `"build"` or `"end"`. `match`: window where `words.json` holds the sung words; each word appears at its detected time, and `text` supplies the correct spelling.
- `end_card[].style`: `rom` (Didot), `ital` (Didot italic), `cap` (Avenir caps). `size` is in px at 1080 wide; `y` is a fraction of the height.
- Pattern inside the chorus: photo 3D, clip with velocity, photo 3D, repeated; every fourth cut flashes. With fewer photos than cuts, photos repeat in order.
- Every run writes `<workdir>/segs.json` (index, start, end, kind, source per cut); `sheet.py segments` reads it.
