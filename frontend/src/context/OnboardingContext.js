import React, { createContext, useContext, useState, useEffect } from 'react';

const OnboardingContext = createContext(null);

/**
 * OnboardingProvider - Manages onboarding state across the app
 */
export const OnboardingProvider = ({ children }) => {
  const [onboardingState, setOnboardingState] = useState({
    isActive: false,
    currentStep: 0,
    completed: false,
    skipped: false,
    steps: [
      { id: 'welcome', title: 'Welcome', completed: false },
      { id: 'profile', title: 'Profile Setup', completed: false },
      { id: 'wallet', title: 'Wallet Funding', completed: false },
      { id: 'package', title: 'Package Purchase', completed: false },
      { id: 'referral', title: 'Referral Program', completed: false },
      { id: 'tour', title: 'Dashboard Tour', completed: false }
    ]
  });

  // Load onboarding state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('onboarding_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setOnboardingState(prev => ({
          ...prev,
          ...parsed
        }));
      } catch (e) {
        console.error('Failed to parse onboarding state');
      }
    }
  }, []);

  // Save onboarding state to localStorage
  useEffect(() => {
    localStorage.setItem('onboarding_state', JSON.stringify(onboardingState));
  }, [onboardingState]);

  const startOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      isActive: true,
      currentStep: 0
    }));
  };

  const nextStep = () => {
    setOnboardingState(prev => {
      const newSteps = [...prev.steps];
      if (prev.currentStep < newSteps.length) {
        newSteps[prev.currentStep] = { ...newSteps[prev.currentStep], completed: true };
      }
      const nextStepIndex = prev.currentStep + 1;
      const isCompleted = nextStepIndex >= newSteps.length;

      return {
        ...prev,
        steps: newSteps,
        currentStep: nextStepIndex,
        isActive: !isCompleted,
        completed: isCompleted
      };
    });
  };

  const prevStep = () => {
    setOnboardingState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1)
    }));
  };

  const goToStep = (stepIndex) => {
    setOnboardingState(prev => ({
      ...prev,
      currentStep: Math.min(Math.max(0, stepIndex), prev.steps.length - 1),
      isActive: true
    }));
  };

  const skipOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      isActive: false,
      skipped: true
    }));
  };

  const completeOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      isActive: false,
      completed: true,
      steps: prev.steps.map(step => ({ ...step, completed: true }))
    }));
  };

  const resetOnboarding = () => {
    const freshState = {
      isActive: false,
      currentStep: 0,
      completed: false,
      skipped: false,
      steps: [
        { id: 'welcome', title: 'Welcome', completed: false },
        { id: 'profile', title: 'Profile Setup', completed: false },
        { id: 'wallet', title: 'Wallet Funding', completed: false },
        { id: 'package', title: 'Package Purchase', completed: false },
        { id: 'referral', title: 'Referral Program', completed: false },
        { id: 'tour', title: 'Dashboard Tour', completed: false }
      ]
    };
    setOnboardingState(freshState);
    localStorage.removeItem('onboarding_state');
  };

  const markStepCompleted = (stepId) => {
    setOnboardingState(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId ? { ...step, completed: true } : step
      )
    }));
  };

  const value = {
    ...onboardingState,
    startOnboarding,
    nextStep,
    prevStep,
    goToStep,
    skipOnboarding,
    completeOnboarding,
    resetOnboarding,
    markStepCompleted,
    totalSteps: onboardingState.steps.length,
    currentStepData: onboardingState.steps[onboardingState.currentStep],
    progress: onboardingState.completed
      ? 100
      : Math.round((onboardingState.currentStep / onboardingState.steps.length) * 100)
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

/**
 * useOnboarding - Hook to access onboarding context
 */
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export default OnboardingContext;