/**
 * Server Status Indicator
 * Shows real-time status of backend services with restart capability
 */
import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, RotateCw, Power } from 'lucide-react';
import { toast } from 'sonner';

interface ServerHealth {
  python: boolean | null;
}

export function ServerStatus() {
  const [health, setHealth] = useState<ServerHealth>({
    python: null,
  });
  const [isChecking, setIsChecking] = useState(true);
  const [isRestarting, setIsRestarting] = useState({ python: false });

  const checkHealth = async () => {
    setIsChecking(true);

    // Check Python Backend (8000)
    let pythonHealthy = false;
    try {
      const pythonRes = await fetch('http://localhost:8000/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
        mode: 'cors',
      });
      pythonHealthy = pythonRes.ok;
    } catch (err) {
      // Silently fail - don't pollute console
      pythonHealthy = false;
    }

    setHealth({
      python: pythonHealthy,
    });
    setIsChecking(false);
  };

  const handleRestartPython = async () => {
    setIsRestarting({ ...isRestarting, python: true });
    toast.info('Restarting Python backend...');

    try {
      await fetch('http://localhost:3020/api/admin/restart/python', {
        method: 'POST',
      });
      toast.success('Python backend restarted! Waiting for it to be ready...');

      // Wait 5 seconds then check health
      setTimeout(() => {
        checkHealth();
        setIsRestarting({ ...isRestarting, python: false });
      }, 5000);
    } catch (err) {
      toast.error('Failed to restart Python backend');
      setIsRestarting({ ...isRestarting, python: false });
    }
  };

  useEffect(() => {
    // Initial check
    checkHealth();

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const StatusIcon = ({ status }: { status: boolean | null }) => {
    if (status === null) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
    }
    return status ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Python Backend */}
      <div className="flex items-center gap-1.5">
        <StatusIcon status={health.python} />
        <span className="text-gray-600 dark:text-gray-400 font-medium">Python</span>
        <span className="text-gray-500 dark:text-gray-500 text-[10px]">:8000</span>
        <button
          onClick={handleRestartPython}
          disabled={isRestarting.python}
          className="p-0.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 cursor-pointer"
          title="Restart Python backend (port 8000)"
        >
          <Power className={`h-3 w-3 text-gray-500 hover:text-orange-400 ${isRestarting.python ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Single refresh button */}
      <button
        onClick={checkHealth}
        disabled={isChecking}
        className="ml-2 p-1 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 cursor-pointer"
        title="Refresh server status"
      >
        <RotateCw className={`h-3.5 w-3.5 text-gray-500 hover:text-gray-300 ${isChecking ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
