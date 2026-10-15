#!/usr/bin/env python3
"""Run a command in its own OS session so it survives the agent session.

Usage: detach.py <name> <out-dir> <cwd> <stdin-file|-> -- <command> [args...]

Writes <out-dir>/<name>.out (stdout), <name>.log (stderr), <name>.pid and,
when the command ends, <name>.exit with its exit code. Watch the .exit file.
"""
import shlex
import subprocess
import sys
from pathlib import Path


def main() -> int:
    if "--" not in sys.argv or len(sys.argv) < 7:
        print(__doc__, file=sys.stderr)
        return 2
    split = sys.argv.index("--")
    name, out_dir, cwd, stdin_file = sys.argv[1:5]
    command = sys.argv[split + 1:]
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    exit_file = out / f"{name}.exit"
    exit_file.unlink(missing_ok=True)
    source = "/dev/null" if stdin_file == "-" else shlex.quote(stdin_file)
    shell = (
        f"{shlex.join(command)} < {source} > {shlex.quote(str(out / f'{name}.out'))} "
        f"2> {shlex.quote(str(out / f'{name}.log'))}; echo $? > {shlex.quote(str(exit_file))}"
    )
    proc = subprocess.Popen(
        ["/bin/bash", "-c", shell],
        cwd=cwd,
        start_new_session=True,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    (out / f"{name}.pid").write_text(str(proc.pid))
    print(f"{name}: pid {proc.pid}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
