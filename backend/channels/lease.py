"""OS-released process lock for the single-worker QQ runtime."""

import os
from pathlib import Path


class WorkerLease:
    def __init__(self, path):
        self.path = Path(str(path) + ".qq.lock")
        self.file = None

    def acquire(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        stream = self.path.open("a+b")
        stream.seek(0, 2)
        if not stream.tell():
            stream.write(b"0")
            stream.flush()
        stream.seek(0)
        try:
            if os.name == "nt":
                import msvcrt

                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl

                fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            stream.close()
            raise RuntimeError(
                "QQ runtime already active for this database; use one worker"
            )
        self.file = stream

    def release(self):
        if self.file:
            self.file.close()
            self.file = None
