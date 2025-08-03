"use strict";
/**
 * Verification Events System
 * Event-driven architecture for automatic verification status updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationEvents = exports.VerificationEventEmitter = void 0;
class VerificationEventEmitter {
    static instance;
    listeners = new Map();
    constructor() { }
    static getInstance() {
        if (!VerificationEventEmitter.instance) {
            VerificationEventEmitter.instance = new VerificationEventEmitter();
        }
        return VerificationEventEmitter.instance;
    }
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                }
                catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    off(event, callback) {
        if (!callback) {
            this.listeners.delete(event);
            return;
        }
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
}
exports.VerificationEventEmitter = VerificationEventEmitter;
exports.verificationEvents = VerificationEventEmitter.getInstance();
//# sourceMappingURL=verification.events.js.map