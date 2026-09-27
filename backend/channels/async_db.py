"""Do not release the process lease while a cancelled database call still writes."""

import asyncio


async def database_call(function, *args, **kwargs):
    task = asyncio.create_task(asyncio.to_thread(function, *args, **kwargs))
    try:
        await asyncio.wait({task})
        return task.result()
    except asyncio.CancelledError:
        # No shield future reporting late failures on Python 3.14 shutdown.
        await asyncio.wait({task})
        if not task.cancelled():
            task.exception()
        raise
