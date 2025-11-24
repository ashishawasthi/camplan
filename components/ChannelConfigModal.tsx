
import React from 'react';
import Button from './common/Button';

interface Props {
  segmentName: string;
  configs: Record<string, any>;
  onClose: () => void;
}

const ChannelConfigModal: React.FC<Props> = ({ segmentName, configs, onClose }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
             Channel Targeting Specs: <span className="text-indigo-600 dark:text-indigo-400">{segmentName}</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow space-y-8">
            {Object.keys(configs).length === 0 ? (
                <p className="text-slate-500 italic">No channel configurations available.</p>
            ) : (
                Object.entries(configs).map(([channel, config]) => (
                    <div key={channel}>
                        <div className="flex justify-between items-center mb-2">
                             <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{channel}</h3>
                             <Button variant="ghost" onClick={() => copyToClipboard(JSON.stringify(config, null, 2))} className="!py-1 !px-2 text-xs">
                                Copy JSON
                             </Button>
                        </div>
                        <div className="bg-slate-900 rounded-md p-4 overflow-x-auto">
                            <pre className="text-xs text-green-400 font-mono">
                                {JSON.stringify(config, null, 2)}
                            </pre>
                        </div>
                    </div>
                ))
            )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default ChannelConfigModal;
