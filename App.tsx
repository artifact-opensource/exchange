import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu } from "lucide-react";
import { SectionId } from "./types";
import DimensionSection from "./components/DimensionSection";
import NavigationOverlay from "./components/NavigationOverlay";
import TerminalOverlay from "./components/TerminalOverlay";
import ProjectCatalogue from "./components/ProjectCatalogue";
import ResearchPortal from "./components/ResearchPortal";
import InfoOverlay from "./components/InfoOverlay";
import BlockchainHero from "./components/BlockchainHero";
import LandingPage from "./components/LandingPage";
import NodeMarkdownViewer from "./components/NodeMarkdownViewer";

// Import dimension configs
import { RESEARCH_CATALOG } from "./lib/research-data";
import { rdConfig } from "./rd/config";
import { mlConfig } from "./ml/config";
import { ftConfig } from "./ft/config";
import { stConfig } from "./st/config";
import { imConfig } from "./im/config";

// Global force-refresh context (used by logo click to trigger GitHub refresh)
export const RefreshContext = createContext<{ triggerRefresh: () => void }>({ triggerRefresh: () => {} });
export const useRefresh = () => useContext(RefreshContext);

export default function App() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentSection, setCurrentSection] = useState<SectionId>(SectionId.RD);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // AVA open_document: resolve nodeId/title against the research catalog and
  // surface it in the markdown viewer overlay.
  const [avaDoc, setAvaDoc] = useState<{ nodeId: string; meta: string } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { nodeId, meta } = (e as CustomEvent<{ nodeId: string; meta?: string }>).detail || {};
      if (!nodeId) return;
      let label = meta || "AVA // OPENED_DOCUMENT";
      const item = RESEARCH_CATALOG.find(
        (x) =>
          x.id === nodeId ||
          x.title.toLowerCase() === String(nodeId).toLowerCase() ||
          x.title.toLowerCase().includes(String(nodeId).toLowerCase())
      );
      if (item) {
        label = meta || `${item.category} · ${item.source} · ${item.date}`;
        return setAvaDoc({ nodeId: item.title, meta: label });
      }
      setAvaDoc({ nodeId, meta: label });
    };
    window.addEventListener("OPEN_DOCUMENT", handler);
    return () => window.removeEventListener("OPEN_DOCUMENT", handler);
  }, []);

  // Force-refresh trigger (bumps key to re-fetch GitHub data)
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // New order: RD -> ML -> FT -> ST -> IM
  const dimensions = [rdConfig, mlConfig, ftConfig, stConfig, imConfig];

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: 0,
        behavior: "instant",
      });
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Desktop only: trigger sidebar if mouse is near right edge (within 50px)
      if (window.innerWidth >= 640) {
        if (e.clientX > window.innerWidth - 50) {
          setIsSidebarOpen(true);
        } else if (e.clientX < window.innerWidth - 400 && isSidebarOpen) {
          // Close if mouse moves away from the 400px sidebar area
          setIsSidebarOpen(false);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isSidebarOpen]);

  // Track global vertical scroll to show/hide header
  useEffect(() => {
    const handleGlobalScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList && target.classList.contains("snap-start")) {
        if (target.scrollTop > 50) {
          setIsHeaderVisible(false);
        } else {
          setIsHeaderVisible(true);
        }
      }
    };
    window.addEventListener("scroll", handleGlobalScroll, true);
    return () => window.removeEventListener("scroll", handleGlobalScroll, true);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, clientWidth } = scrollContainerRef.current;
    const scrollPosition = Math.round(scrollLeft / clientWidth);

    const sections = [
      SectionId.RD,
      SectionId.ML,
      SectionId.FT,
      SectionId.ST,
      SectionId.IM,
    ];
    if (
      sections[scrollPosition] &&
      sections[scrollPosition] !== currentSection
    ) {
      setCurrentSection(sections[scrollPosition]);
    }
  }, [currentSection]);

  const navigateTo = (section: SectionId) => {
    if (!scrollContainerRef.current) return;

    const { clientWidth } = scrollContainerRef.current;
    if (clientWidth === 0) return;

    const sections = [
      SectionId.RD,
      SectionId.ML,
      SectionId.FT,
      SectionId.ST,
      SectionId.IM,
    ];
    const index = sections.indexOf(section);

    if (index !== -1) {
      scrollContainerRef.current.scrollTo({
        left: index * clientWidth,
        behavior: "smooth",
      });
      setCurrentSection(section);
    }
  };

  return (
    <RefreshContext.Provider value={{ triggerRefresh }}>
    <main className="relative w-full h-[100dvh] bg-[#030303] selection:bg-white selection:text-black touch-pan-x overflow-hidden">
      {/* Landing Page */}
      <AnimatePresence>
        {showLanding && (
          <LandingPage onEnter={() => setShowLanding(false)} />
        )}
      </AnimatePresence>

      {/* Precision Header */}
      <header
        className={`fixed top-0 left-0 w-full p-6 md:p-12 z-[90] flex justify-between items-start pointer-events-none transition-opacity duration-500 ${isHeaderVisible ? "opacity-100" : "opacity-0"}`}
      >
        {/* SMART LOGO ICON */}
        <div
          className="flex flex-col gap-1 pointer-events-auto cursor-pointer group"
          onClick={() => {
            if (showLanding) {
              setShowLanding(false);
            } else {
              triggerRefresh();
              setIsInfoOpen(!isInfoOpen);
            }
          }}
        >
          <div className="flex items-center gap-3 transition-transform duration-500 group-hover:-translate-y-1">
            <div className="w-6 h-6 md:w-8 md:h-8 border border-white flex items-center justify-center font-bold text-white italic text-xs md:text-sm group-hover:bg-white group-hover:text-black transition-all duration-500 shadow-none group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              AV
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-[0.5em] md:tracking-[0.8em] text-[10px] md:text-[11px] uppercase text-white">
                ARTIFACT VIRTUAL
              </span>
              <div className="h-[1px] w-0 bg-white/40 group-hover:w-full transition-all duration-700 mt-1"></div>
            </div>
          </div>
          <div className="text-[7px] md:text-[9px] font-mono text-white/20 tracking-[0.3em] mt-2 uppercase hidden sm:block group-hover:text-white/50 transition-colors">
            INFO_SYSTEM // ACCESS_ROOT
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-6">
          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="sm:hidden p-2 text-white/30 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Standalone Terminal Button */}
      <button
        onClick={() => setIsTerminalOpen(true)}
        className="fixed bottom-6 right-6 z-[100] group flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/10 p-4 hover:border-white/40 transition-all outline-none rounded-full"
      >
        <div className="flex items-center gap-3 text-white/60 group-hover:text-white">
          <span className="text-[10px] uppercase tracking-[0.4em] font-bold">
            TERMINAL
          </span>
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
        </div>
      </button>

      {/* Main Horizontal Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="snap-container w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory"
      >
        <motion.div
          animate={{
            filter:
              isSidebarOpen || isInfoOpen
                ? "blur(10px) brightness(0.5)"
                : "blur(0px) brightness(1)",
            opacity: isInfoOpen ? 0.2 : 1,
          }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className={`flex h-full w-fit transition-transform duration-700`}
        >
          {dimensions.map((config) => (
            <DimensionSection
              key={config.id}
              id={config.id}
              title={config.title}
              subtitle={config.subtitle}
              bgGradient={config.bgGradient}
              accentColor={config.accentColor}
              sourceUrls={config.sourceUrls}
              isHero={config.id === SectionId.FT}
            >
              {/* AV/RD */}
              {config.id === SectionId.RD && <ResearchPortal />}

              {/* AV/FT specific Hero */}
              {config.id === SectionId.FT && <BlockchainHero />}

              {/* AV/ML and AV/FT */}
              {(config.id === SectionId.ML || config.id === SectionId.FT) && (
                <ProjectCatalogue
                  accentColor={config.accentColor}
                  repoPaths={config.sourceUrls
                    .filter((url) => url.includes("github.com"))
                    .map((url) => {
                      const cleanUrl = url
                        .replace("https://github.com/", "")
                        .split("?")[0];
                      const parts = cleanUrl.split("/");
                      return `${parts[0]}/${parts[1]}`;
                    })}
                />
              )}

              {/* AV/ST placeholder */}
              {config.id === SectionId.ST && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="font-mono text-[10px] text-white/20 tracking-[0.5em] uppercase border border-white/5 p-12">
                    Orbital_Ops // Foundation_Node
                  </div>
                </div>
              )}

              {/* Empty space for IM */}
              {config.id === SectionId.IM && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="font-mono text-[10px] text-white/20 tracking-[0.5em] uppercase border border-white/5 p-12">
                    Space_Reserved // Institutional_Node
                  </div>
                </div>
              )}
            </DimensionSection>
          ))}
        </motion.div>
      </div>

      <NavigationOverlay
        currentSection={currentSection}
        onNavigate={navigateTo}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <TerminalOverlay
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
      />

      <InfoOverlay isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />

      {/* AVA document viewer (open_document tool) */}
      {avaDoc && (
        <NodeMarkdownViewer
          nodeId={avaDoc.nodeId}
          metadata={avaDoc.meta}
          onClose={() => setAvaDoc(null)}
        />
      )}

      {/* Persistence Telemetry (Mobile Optimized) */}
      <div className="fixed bottom-6 left-6 md:bottom-12 md:left-12 z-40 pointer-events-none opacity-20 hidden xs:block">
        <div className="space-y-1 font-mono text-[7px] md:text-[8px] text-white tracking-[0.4em] uppercase">
          <p>NET_STATUS: OK</p>
          <p className="hidden md:block">
            NODE: {dimensions.find((d) => d.id === currentSection)?.id}
          </p>
        </div>
      </div>
    </main>
    </RefreshContext.Provider>
  );
}
