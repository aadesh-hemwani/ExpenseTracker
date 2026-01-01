import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // eslint-disable-next-line prefer-template
      console.log("SW Registered: " + r);
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[100] w-[90%] max-w-sm">
      <div className="bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900 p-4 rounded-2xl shadow-2xl border border-white/10 dark:border-zinc-900/10 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-sm">
              {offlineReady
                ? "App ready to work offline"
                : "New content available"}
            </h3>
            <p className="text-xs opacity-80 mt-1">
              {offlineReady
                ? "You can use the app without internet."
                : "A new version of the app is ready to be installed."}
            </p>
          </div>
          <button
            onClick={close}
            className="p-1 hover:bg-white/10 dark:hover:bg-zinc-900/10 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {needRefresh && (
          <button
            onClick={() => updateServiceWorker(true)}
            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            <RefreshCw size={16} />
            Reload & Update
          </button>
        )}
      </div>
    </div>
  );
}

export default ReloadPrompt;
