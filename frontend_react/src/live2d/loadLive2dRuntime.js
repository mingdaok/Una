const RUNTIME_SCRIPTS = [
  'libs/core_v4.js',
  'libs/pixi_v533.js',
  'libs/live2d_plugin_v4.js',
];

let runtimePromise;

function appendScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-live2d-runtime="${src}"]`);
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    const script = existing || document.createElement('script');
    script.dataset.live2dRuntime = src;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Live2D 运行库加载失败：${src}`)), { once: true });

    if (!existing) {
      script.src = `${import.meta.env.BASE_URL || './'}${src}`;
      script.async = false;
      document.head.appendChild(script);
    }
  });
}

export function loadLive2dRuntime() {
  if (window.PIXI?.live2d?.Live2DModel) return Promise.resolve();

  if (!runtimePromise) {
    runtimePromise = RUNTIME_SCRIPTS.reduce(
      (chain, src) => chain.then(() => appendScript(src)),
      Promise.resolve(),
    ).catch(error => {
      runtimePromise = undefined;
      throw error;
    });
  }

  return runtimePromise;
}
