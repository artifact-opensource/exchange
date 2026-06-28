import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const ONBOARDING_STEPS = [
  {
    target: '#nav-dashboard',
    title: 'Investor Dashboard',
    description: "Get a bird's eye view of your active investments, recent proposals, and overall portfolio health."
  },
  {
    target: '#nav-portfolio',
    title: 'Your Portfolio',
    description: "Deep dive into your individual asset allocations, historical performance, and return metrics."
  },
  {
    target: '#nav-voting',
    title: 'Governance & Voting',
    description: "Participate in key company decisions and vote on active proposals using your designated voting weight."
  },
  {
    target: '#nav-documents',
    title: 'Secure Documents',
    description: "Access your private K-1s, quarterly reports, and important investor updates in one secure vault."
  }
];

export const OnboardingHelper = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenOnboarding_v1');
    if (!hasSeen) {
      // Delay slightly to ensure DOM is fully rendered
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateTargetPosition = useCallback(() => {
    if (!isVisible) return;
    const targetElement = document.querySelector(ONBOARDING_STEPS[currentStep].target);
    if (targetElement) {
      setTargetRect(targetElement.getBoundingClientRect());
      // Optionally smooth scroll target into view if offscreen, but sidebar is fixed
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isVisible]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    return () => window.removeEventListener('resize', updateTargetPosition);
  }, [updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding_v1', 'true');
    setIsVisible(false);
  };

  if (!isVisible || !targetRect) return null;

  const stepInfo = ONBOARDING_STEPS[currentStep];

  // Tooltip positioned to the right of the sidebar item
  const tooltipStyle: React.CSSProperties = {
    top: targetRect.top + (targetRect.height / 2),
    left: targetRect.right + 24,
    transform: 'translateY(-50%)',
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none hidden md:block">
      {/* Dark Overlay (pointer-events-auto to block clicks underneath while active) */}
      <div 
        className="absolute inset-0 bg-black/20 pointer-events-auto backdrop-blur-[1px] transition-all duration-300" 
        onClick={handleComplete}
      />
      
      {/* Spotlight cutout */}
      <div 
        className="absolute bg-transparent pointer-events-none transition-all duration-300 ease-in-out border-2 border-teal-500 rounded-lg shadow-2xl z-10"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: '0 0 0 9999px rgba(9, 9, 11, 0.75), 0 0 20px 0 rgba(20, 184, 166, 0.4) inset'
        }}
      />

      {/* Tooltip Card */}
      <div 
        className="absolute pointer-events-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 w-[320px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] opacity-100 z-20"
        style={tooltipStyle}
      >
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-900 border-l border-b border-zinc-700 transform rotate-45" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-teal-400 uppercase mb-1 block">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </span>
              <h3 className="text-base font-semibold text-white">{stepInfo.title}</h3>
            </div>
            <button 
              onClick={handleComplete}
              className="text-zinc-500 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-sm text-zinc-400 leading-relaxed mb-5">
            {stepInfo.description}
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
            <button
              onClick={handleComplete}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors rounded-md hover:bg-zinc-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-md transition-colors"
              >
                {currentStep === ONBOARDING_STEPS.length - 1 ? 'Finish' : 'Next'}
                {currentStep !== ONBOARDING_STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
