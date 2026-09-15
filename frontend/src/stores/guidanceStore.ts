import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GuidanceWorkflow } from '../types/guidance';

export type GuidanceStatus = 'idle' | 'active' | 'paused' | 'waiting' | 'completed';

interface GuidanceState {
    isActive: boolean;
    currentWorkflow: GuidanceWorkflow | null;
    currentStepIndex: number;
    status: GuidanceStatus;
    guidanceLevel: 'full' | 'minimal' | 'off';
    completedWorkflows: string[];

    // Actions
    setGuidanceLevel: (level: 'full' | 'minimal' | 'off') => void;
    startWorkflow: (workflow: GuidanceWorkflow) => void;
    nextStep: () => void;
    previousStep: () => void;
    pause: () => void;
    resume: () => void;
    skip: () => void;
    replay: () => void;
    complete: () => void;
    markDontShowAgain: (workflowId: string) => void;

    // Derived states (these can be computed in selectors, but defining them in store for convenience if needed, though typically derived state is better computed in the hook)
}

export const useGuidanceStore = create<GuidanceState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentWorkflow: null,
      currentStepIndex: 0,
      status: 'idle',
      guidanceLevel: 'off',
      completedWorkflows: [],

      setGuidanceLevel: (_level) => set({ guidanceLevel: 'off' }),

      startWorkflow: (_workflow) => {
        // Disabled - Step Guide / Onboarding Tour popup completely removed
        return;
      },

      nextStep: () => {
        const { currentWorkflow, currentStepIndex } = get();
        if (!currentWorkflow || !currentWorkflow.steps) return;
        
        if (currentStepIndex < currentWorkflow.steps.length - 1) {
            set({ currentStepIndex: currentStepIndex + 1, status: 'active' });
        } else {
            get().complete();
        }
      },

      previousStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
            set({ currentStepIndex: currentStepIndex - 1, status: 'active' });
        }
      },

      pause: () => set({ status: 'paused' }),
      
      resume: () => set({ status: 'active' }),
      
      skip: () => set({ isActive: false, status: 'idle', currentWorkflow: null, currentStepIndex: 0 }),
      
      replay: () => set({ currentStepIndex: 0, status: 'active' }),
      
      complete: () => set({ status: 'completed' }),

      markDontShowAgain: (workflowId) => {
        set((state) => ({
            completedWorkflows: [...new Set([...state.completedWorkflows, workflowId])]
        }));
      }
    }),
    {
      name: 'guidance-storage',
      partialize: (state) => ({ 
        completedWorkflows: state.completedWorkflows,
        guidanceLevel: state.guidanceLevel 
      }), // only persist preferences
    }
  )
);
