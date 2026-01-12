import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'default';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        setOptions(opts);
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const handleConfirm = () => {
        setIsOpen(false);
        resolveRef.current?.(true);
        resolveRef.current = null;
        setOptions(null);
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolveRef.current?.(false);
        resolveRef.current = null;
        setOptions(null);
    };

    const variantStyles = {
        danger: {
            header: 'bg-red-500/10',
            icon: 'text-red-500',
            button: 'bg-red-500 hover:bg-red-600 text-white',
        },
        warning: {
            header: 'bg-yellow-500/10',
            icon: 'text-yellow-500',
            button: 'bg-yellow-500 hover:bg-yellow-600 text-black',
        },
        default: {
            header: 'bg-muted',
            icon: 'text-muted-foreground',
            button: 'bg-primary hover:bg-primary/90 text-primary-foreground',
        },
    };

    const styles = variantStyles[options?.variant || 'default'];

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}

            {/* Confirm Modal */}
            {isOpen && options && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className={`flex items-center justify-between p-4 border-b border-border ${styles.header}`}>
                            <div className={`flex items-center gap-2 ${styles.icon}`}>
                                <AlertTriangle size={20} />
                                <h3 className="font-semibold">{options.title}</h3>
                            </div>
                            <button
                                onClick={handleCancel}
                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {options.message}
                            </p>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded transition-colors"
                                >
                                    {options.cancelText || 'Cancel'}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className={`px-4 py-2 text-sm rounded transition-colors ${styles.button}`}
                                >
                                    {options.confirmText || 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

export const useConfirm = (): ConfirmContextType => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};
