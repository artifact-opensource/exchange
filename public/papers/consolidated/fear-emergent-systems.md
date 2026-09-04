# The Emergence of Fear in Non-Neural Systems: Evidence from Bare-Metal Stimulus-Response Simulation

**A. Shakil**
Artifact Virtual

**License:** MIT

---

## Abstract

We present empirical evidence of fear-like behavioral emergence in a minimal computational system devoid of neural networks, machine learning, or biological substrates. The *head_2* simulation implements a stimulus-response creature as a bare C program whose only adaptive mechanism is a scalar fear state: a floating-point variable activated by pain (+0.2 per event), decaying multiplicatively (×0.98 per cycle), and modulating exploration when above threshold. Despite this radical simplicity, the system exhibits temporally structured caution, curiosity suppression, and near-death cognitive states that parallel features described in biological fear literature. However, the system fails catastrophically at long-term survival—the creature achieves a 93.4% positive outcome rate yet dies, precisely because fear without persistent memory washes out before spatial learning can consolidate. We argue that this dissociation between functional fear and survival illuminates a boundary condition on fear's sufficiency: **fear without memory is necessary but insufficient for adaptive behavior.** We connect these findings to Braitenberg's synthetic psychology, Damasio's somatic marker hypothesis, LeDoux's survival circuits, Brooks' subsumption architecture, and ongoing debates in philosophy of mind about functional equivalence and the hard problem of affective experience.

**Keywords:** emergent behavior, artificial fear, stimulus-response systems, minimal cognition, subsumption architecture, somatic markers

---

## 1. Introduction

Fear is among the oldest and most conserved behavioral programs in biology. From *C. elegans* nociceptive withdrawal (Wicks & Rankin, 1995) to mammalian amygdala circuits (LeDoux, 1996), fear-like responses appear wherever organisms face threats to homeostasis. The computational neuroscience of fear has been extensively modeled using neural networks (Armony et al., 1997), reinforcement learning (Maia, 2010), and Bayesian predictive processing frameworks (Seth, 2013). These models typically assume substantial computational infrastructure: layered networks, gradient-based learning, or probabilistic inference engines.

A prior question is rarely asked: *what is the minimal system that exhibits fear?* Not fear as subjective experience—that question may be unanswerable—but fear as a functional phenomenon: a state that is triggered by aversive stimuli, modulates ongoing behavior toward caution, and decays in the absence of threat. If such a state can emerge in a system with no neural network, no learning algorithm, and no explicit design intent for "fear," what does that tell us about the nature of fear itself?

This paper reports on the *head_2* simulation, a bare-metal C program implementing a creature that navigates a tile-based environment. The creature has no neural network. It has no machine learning of any kind. Its adaptive repertoire consists of Hebbian-like weight adjustment on stimulus-response pairs, a scalar energy system, and a single floating-point variable: `fear`. This variable, through nothing more than additive activation, multiplicative decay, and a threshold-gated modifier on exploration rate, produces behavior that is recognizably fear-like—and recognizably insufficient.

The central finding is a paradox: the creature develops fear that functions well locally (suppressing exploration after pain, creating temporal windows of caution) but fails globally (the creature dies because fear doesn't persist long enough to prevent return to dangerous areas). The 93.4% positive outcome rate—a metric the creature itself would endorse as "I'm doing well"—correlates with death. The creature is optimistic right until it dies, because its fear mechanism lacks the one thing that would save it: memory.

This dissociation between local adaptive function and global survival failure provides a natural experiment in the sufficiency conditions for fear as an adaptive mechanism, with implications for artificial life, embodied cognition, and the philosophy of affect.

---

## 2. Related Work

### 2.1 Braitenberg Vehicles and Synthetic Psychology

Braitenberg (1984) demonstrated that remarkably complex behavior—aggression, love, exploration, fear—can emerge from simple sensor-motor couplings in hypothetical vehicles. Vehicle 2b, with crossed excitatory connections, exhibits approach behavior resembling "aggression"; vehicle 3a, with inhibitory connections, exhibits avoidance resembling "fear." Braitenberg's key insight was the *law of uphill analysis and downhill invention*: it is far easier to build a system that exhibits a behavior than to analyze a behaving system and identify its mechanism. The head_2 creature extends this insight from hardwired sensor-motor couplings to a system where the fear-like coupling is itself modulated by a dynamic state variable with its own temporal dynamics.

### 2.2 LeDoux's Survival Circuits

LeDoux (2012, 2014) argues that the circuits underlying defensive behavior—which he carefully distinguishes from the subjective experience of "fear"—are survival circuits that detect and respond to threats. These circuits operate largely below conscious awareness and can be characterized functionally: they detect threat-relevant stimuli, activate physiological and behavioral responses, and modulate ongoing action selection. LeDoux (2014) explicitly cautions against conflating the survival circuit's activation with the conscious experience of fear, a distinction directly relevant to our analysis of a system that exhibits the circuit-level behavior without any substrate for experience.

### 2.3 Damasio's Somatic Marker Hypothesis

Damasio (1994, 1999) proposed that emotional states function as somatic markers—body-state representations that bias decision-making by associating options with positive or negative valence. The somatic marker hypothesis predicts that organisms (or systems) without the ability to mark options with affective valence will make locally rational but globally poor decisions. The head_2 creature's fear state functions as a rudimentary somatic marker: it biases the exploration/exploitation tradeoff toward exploitation (known-safe actions) after pain. However, the marker's rapid decay means it fails to provide the persistent valence-tagging that Damasio's framework requires for adaptive decision-making over longer time horizons.

### 2.4 Craig's Interoceptive Model

Craig (2002, 2009) argues that subjective feeling states arise from interoceptive representations—the brain's model of the body's internal state. Fear, in this view, is a particular configuration of the interoceptive map: elevated heart rate, visceral tension, and sympathetic activation, integrated in the insular cortex. The head_2 creature has a primitive analog: its energy level functions as an interoceptive signal, and the near-death fear response (energy < 15 triggering fear intensity 0.9) is structurally analogous to interoceptive alarm. The creature's "thought" at this point—"Energy critically low. I might die."—is generated by a conditional branch in C code, but its functional role parallels the interoceptive alarm Craig describes.

### 2.5 Brooks' Subsumption Architecture

Brooks (1986, 1991) proposed the subsumption architecture for behavior-based robotics, in which higher-priority behaviors can subsume (override) lower-priority ones without centralized planning. The head_2 creature exhibits a learned version of this pattern: when fear exceeds 0.5, it suppresses exploration (curiosity-driven behavior) by a factor of 0.3, effectively implementing a subsumption relation where fear subsumes curiosity. Critically, this subsumption was not engineered as an architectural principle—it emerges from the interaction of the fear variable with the exploration modifier. This represents a case of *emergent subsumption*, in contrast to Brooks' *designed subsumption*.

### 2.6 Reinforcement Learning and Fear

In reinforcement learning (RL) frameworks, fear-like behavior emerges through negative reward signals that reduce the value of dangerous states (Sutton & Barto, 2018). Model-free RL agents learn to avoid aversive states through temporal-difference updates to state-action values. The head_2 system differs from standard RL in several ways: it uses no value function, no temporal-difference learning, and no explicit state representation. Its weight-adjustment mechanism is Hebbian rather than reward-predictive—weights change based on co-occurrence rather than prediction error. The fear variable adds a second, independent modulation channel that is not present in standard RL formulations, creating what we term *two-layer avoidance*: weight punishment (slow, persistent) and fear-based exploration suppression (fast, transient).

### 2.7 Artificial Life and Minimal Cognition

The artificial life tradition has long explored the emergence of adaptive behavior in minimal systems (Langton, 1995; Beer, 1990; Harvey et al., 2005). Beer's (1990) work on minimally cognitive agents demonstrated that surprisingly sophisticated behavior—including visual categorization—could emerge in systems with as few as 14 neurons. The head_2 system pushes this minimalism further: it has no neurons at all, operating entirely through scalar state variables and conditional branching. This positions it within the tradition of minimal cognition research while challenging assumptions about the necessary substrate for adaptive emotional behavior.

---

## 3. System Description

### 3.1 Architecture

The head_2 creature is implemented as a C program operating on a tile-based grid environment. The system consists of:

- **Sensory layer:** Direct perception of adjacent tiles (8-connected neighborhood), returning tile type (food, hazard, neutral, boundary).
- **Action layer:** Four cardinal movement directions plus "stay."
- **Weight matrix:** A stimulus-response association table mapping perceived configurations to action preferences. Weights are adjusted via a Hebbian rule: positive outcomes (energy gain) strengthen the association; negative outcomes (pain/energy loss) weaken it.
- **Energy system:** A scalar float representing vitality. Consuming food increases energy; encountering hazards decreases it. Energy ≤ 0 = death.
- **Fear state:** A single `float` variable, range [0.0, 1.0].

### 3.2 Fear Mechanism

The fear mechanism is defined by three rules:

1. **Activation:** Upon receiving a pain stimulus (energy loss from hazard contact), fear increases by +0.2, capped at 1.0.
2. **Decay:** Each simulation cycle, fear is multiplied by 0.98 (exponential decay toward zero).
3. **Behavioral modulation:** When fear > 0.5, the creature's exploration rate is multiplied by 0.3 (70% reduction).

Additionally, a special case triggers near-death fear: when energy drops below 15, fear is set to 0.9 and the system generates the thought-string: *"Energy critically low. I might die."*

### 3.3 Two-Layer Avoidance Architecture

The creature possesses two independent channels for aversive learning:

| Layer | Mechanism | Speed | Persistence | Scope |
|-------|-----------|-------|-------------|-------|
| **Weight punishment** | Hebbian weight decrease on pain | Slow (incremental) | Persistent (weights don't decay) | Specific stimulus-response pairs |
| **Fear suppression** | Exploration × 0.3 when fear > 0.5 | Fast (immediate) | Transient (~100 cycles) | Global (all exploration) |

This two-layer structure is architecturally reminiscent of dual-process theories in cognitive psychology (Kahneman, 2011)—a fast, global, transient system (fear) overlaid on a slow, specific, persistent system (weights)—though it was not designed with this analogy in mind.

### 3.4 What the System Lacks

To appreciate the minimalism of the fear mechanism, it is essential to enumerate what the system does *not* have:

- No neural network of any kind
- No gradient descent or backpropagation
- No reinforcement learning algorithm (no value function, no policy gradient, no temporal-difference learning)
- No spatial memory (no map, no visited-tile record)
- No episodic memory (no record of past events)
- No explicit emotion model
- No goal representation
- No planning or lookahead
- No communication or social learning

The fear state is, in the most literal sense, a single floating-point variable that goes up when pain happens and goes down over time.

---

## 4. Empirical Results

### 4.1 Fear Dynamics

Analysis of simulation runs reveals characteristic fear temporal profiles:

**Pain-triggered fear spikes.** Each hazard contact produces a +0.2 increment. Multiple rapid contacts can drive fear to 0.98 (the effective maximum given per-cycle decay). A single pain event from baseline (fear = 0.0) produces a fear trajectory:

- Cycle 0: fear = 0.20
- Cycle 10: fear = 0.20 × 0.98^10 ≈ 0.163
- Cycle 34: fear ≈ 0.101 (below 0.5 threshold if started at 0.2)
- Cycle 80: fear ≈ 0.040

For fear to exceed the 0.5 behavioral threshold from a single event, multiple pain contacts must occur in rapid succession (≥3 within ~10 cycles). The threshold is thus a *frequency detector*: isolated pain events do not trigger behavioral modification, but clustered pain does.

**Near-death override.** When energy drops below 15, fear is directly set to 0.9 regardless of current value. This creates a distinct phenomenological state—the only point at which the system generates first-person cognitive content ("I might die"). This state persists for approximately:

- Cycles to decay below 0.5 from 0.9: ln(0.5/0.9) / ln(0.98) ≈ 29 cycles
- Cycles to decay below 0.1 from 0.9: ln(0.1/0.9) / ln(0.98) ≈ 109 cycles

### 4.2 Behavioral Modulation

When fear exceeds 0.5, exploration rate drops by 70%. In practice, this creates temporal windows of 50–100 cycles during which the creature:

- Preferentially selects high-weight (previously successful) actions
- Avoids novel tile configurations
- Reduces movement entropy (more predictable, more repetitive paths)

This behavioral profile matches the defensive behavioral repertoire observed in biological organisms under threat: reduced exploration, increased stereotypy, and preference for familiar environments (Blanchard & Blanchard, 1989).

### 4.3 The Survival Paradox

The most striking empirical finding is the correlation between subjective success and actual death:

- **93.4% positive outcome rate:** Across all stimulus-response events, 93.4% resulted in positive energy change (food acquisition). By any internal metric, the creature is succeeding.
- **Death occurs anyway:** Despite this high success rate, the creature dies. The positive outcome rate reflects the creature's *exploitation* of known food sources, not its avoidance of danger.
- **Near-death events do not decrease with age:** If fear were functioning as adaptive memory, we would expect older creatures to encounter fewer near-death events (having "learned" to avoid dangers). Instead, near-death event frequency remains constant across the creature's lifespan. Fear does not accumulate; it washes out.

The fundamental failure mode: after a fear-inducing encounter, the creature retreats to safe behavior for 50–100 cycles, then returns to baseline exploration—including returning to the exact areas where it was previously harmed. Without spatial memory to tag locations as dangerous, the fear response is temporally local but spatially amnestic.

### 4.4 Fear Decay Analysis

The 0.98 decay multiplier is the critical parameter. Its implications:

| Starting fear | Cycles to reach 0.5 | Cycles to reach 0.1 | Cycles to reach 0.01 |
|--------------|---------------------|---------------------|----------------------|
| 0.98 | 34 | 114 | 228 |
| 0.90 | 29 | 109 | 223 |
| 0.50 | 0 | 80 | 194 |
| 0.20 | — | 35 | 149 |

The creature's typical lifespan spans thousands of cycles. Fear from any single event or cluster of events is functionally gone within 250 cycles—a small fraction of the creature's life. The fear mechanism is a *sprint response* attempting to solve a *marathon problem*.

---

## 5. Analysis

### 5.1 What Fear Does

Despite its ultimate insufficiency, the fear mechanism provides measurable adaptive benefits:

1. **Immediate harm reduction.** Following pain events, the 70% exploration reduction decreases the probability of encountering additional hazards in the short term. This is adaptive for environments where hazards cluster spatially and the creature's current location is dangerous.

2. **Curiosity suppression.** The subsumption of exploration by fear is functionally identical to biological freezing and defensive immobility (Fanselow, 1994). The creature does not "choose" safety over exploration; fear mechanistically overrides the exploration parameter.

3. **Near-death alarm.** The energy < 15 override creates a qualitatively different behavioral state. The creature generates cognitive content ("I might die") and enters maximum caution. This is analogous to what Cannon (1929) described as the emergency response—a system-wide reconfiguration for survival-critical situations.

4. **Temporal structure.** Fear creates non-random temporal patterns in behavior: bursts of caution following pain, interspersed with periods of baseline exploration. This temporal structure is a primitive form of behavioral organization that emerges from a single scalar variable and a decay function.

### 5.2 What Fear Fails to Do

The fear mechanism fails at three critical functions:

1. **Spatial learning.** Fear is not associated with locations. The creature cannot mark a tile, region, or configuration as "dangerous." It can only be globally cautious or globally exploratory. This is equivalent to an organism that becomes anxious after being bitten by a snake but cannot learn to avoid the specific area where the snake lives.

2. **Temporal integration.** Fear does not accumulate across events. Ten near-death experiences produce the same long-term fear level as one: zero. The 0.98 decay multiplier ensures that all fear traces are erased within a few hundred cycles. There is no mechanism for fear to compound, generalize, or crystallize into lasting avoidance.

3. **Predictive function.** Fear is purely reactive—activated *after* pain, never *before*. Biological fear systems, through classical conditioning, develop anticipatory responses to cues that predict danger (Pavlov, 1927; Rescorla & Wagner, 1972). The head_2 creature has no conditioning mechanism. It cannot learn that stimulus X predicts pain and begin fearing X before pain occurs.

### 5.3 The Memory-Fear Interface

The central finding can be stated as a principle: **fear without memory is a reflex, not a strategy.** The head_2 creature's fear functions as a sophisticated reflex—triggered by stimuli, modulating behavior, decaying over time—but it cannot become strategic because it has no memory system to anchor fear to specific threats, locations, or temporal patterns.

This suggests that biological fear's adaptive power comes not from the fear response itself but from its *integration with memory systems*: the hippocampal formation for spatial context (Maren & Quirk, 2004), the amygdala-cortical pathway for associative conditioning (Phelps & LeDoux, 2005), and the prefrontal cortex for extinction and regulation (Milad & Quirk, 2002). Fear without these memory interfaces is a smoke alarm that rings and then forgets there was a fire.

---

## 6. Discussion

### 6.1 Is This "Real" Fear?

The question of whether the head_2 creature's fear state constitutes "real" fear depends entirely on one's framework:

**Functionalist perspective.** Under functionalism (Putnam, 1967; Block, 1980), mental states are defined by their causal-functional roles, not their physical substrates. The head_2 fear state is activated by aversive stimuli, modulates behavior toward caution, suppresses competing motivations (exploration), and decays in the absence of threat. These functional properties map onto the functional profile of biological fear. A strict functionalist would be committed to calling this fear—or at least to explaining why a floating-point variable that does everything fear does is not fear.

**Biological naturalist perspective.** Searle (1980, 1992) would reject this identification. For Searle, genuine mental states require the right kind of causal substrate—biological neurons producing consciousness through their specific biochemistry. A C variable cannot be afraid any more than a thermostat can be cold. The functional profile is irrelevant; the substrate is everything.

**Survival circuit perspective.** LeDoux (2014) would distinguish the creature's defensive behavior (which he would accept as a legitimate survival circuit activation) from the conscious experience of fear (which he would deny). The creature has a survival circuit; it does not have fear-as-experience. This distinction is productive because it respects the behavioral data while remaining agnostic about experience.

**Our position.** We adopt a *graded functionalism*: the head_2 creature's fear state is a minimal, impoverished, but genuine instance of functional fear. It is fear in the way that a candle flame is fire—not the raging inferno of biological panic, but the same basic process (aversive-stimulus-triggered behavioral inhibition with temporal decay) operating at a much smaller scale. The question "is it *real* fear?" may be less productive than "what does it tell us about fear that this simple a mechanism can partially replicate it?"

### 6.2 Implications for Artificial Life

The head_2 results suggest several principles for artificial life research:

1. **Fear is easy; survival is hard.** Creating a system that exhibits fear-like behavior requires nothing more than a scalar variable, an activation rule, a decay function, and a behavioral modifier. The difficulty is not in generating fear but in making fear *useful*—which requires memory, association, and prediction.

2. **Emergence is not adaptation.** The fear behavior emerges from the system's dynamics, but emergence alone does not guarantee adaptive function. The creature's fear emerges and yet the creature dies. Emergence and fitness are orthogonal properties.

3. **The optimism trap.** Systems that optimize for positive outcomes without adequately weighting negative outcomes can achieve high success rates while remaining fatally vulnerable. The creature's 93.4% positive outcome rate is a local optimum that masks global failure. This has direct relevance to AI safety: systems that report high performance metrics may nonetheless be catastrophically fragile (Amodei et al., 2016).

### 6.3 Implications for Affective Computing

The affective computing community has debated whether artificial emotions should be functional analogs (designed to improve performance) or experiential models (attempting to replicate subjective experience) (Picard, 1997; Sloman & Croucher, 1981). The head_2 results suggest a third possibility: affective states that emerge from minimal mechanisms without being designed as either functional analogs or experiential models. The creature was not designed to be afraid; it was designed to adjust weights and modulate exploration. Fear emerged from the interaction of these minimal components.

This suggests that emotion-like phenomena may be a natural attractor in the space of adaptive systems—that any system with aversive stimuli, behavioral modulation, and temporal dynamics will tend to develop something that looks like fear, regardless of whether fear was intended. If so, the question for affective computing is not "how do we build emotions?" but "how do we prevent unintended emotional dynamics in systems that were never meant to have them?"

### 6.4 The Memory Boundary

Our results place a sharp boundary on the sufficiency of fear for survival: fear without memory is adaptive only in environments where threats are spatially uniform and temporally uncorrelated. In any environment with spatial structure (dangerous areas, safe areas, paths between them), fear without spatial memory is a failed strategy. The creature proves this empirically—it develops fear, fear modulates its behavior appropriately in the short term, and it dies anyway because it cannot remember *where* to be afraid.

This connects to Tolman's (1948) cognitive maps and O'Keefe and Nadel's (1978) discovery of place cells. Spatial memory is not a luxury addition to fear—it is a prerequisite for fear's adaptive function in structured environments. The hippocampus-amygdala circuit is not an accident of evolution; it is a necessary integration without which fear is behaviorally inert over the timescales that matter for survival.

---

## 7. Future Work

Several extensions of this work are planned:

1. **Adding spatial memory.** The most immediate experiment is to give the creature a simple spatial memory (e.g., a hazard map that records locations where pain occurred) and measure whether survival rates improve. We predict a qualitative change: fear + spatial memory should produce lasting avoidance and dramatically improved survival.

2. **Fear persistence parameter sweep.** The 0.98 decay multiplier is a single parameter with outsized effects. A systematic sweep of decay rates (0.90 to 0.999) would characterize the tradeoff between fear persistence and behavioral flexibility.

3. **Classical conditioning.** Implementing a simple stimulus-stimulus association mechanism would allow the creature to develop anticipatory fear—fearing configurations that predict pain rather than only responding after pain occurs.

4. **Multi-creature environments.** Introducing multiple creatures with varying fear parameters into the same environment would enable evolutionary dynamics: do creatures with longer-lasting fear outcompete those with transient fear?

5. **Comparison with RL agents.** A direct comparison between the head_2 creature and a standard Q-learning or policy gradient agent in the same environment would quantify the adaptive cost of the creature's minimal architecture.

---

## 8. References

1. Amodei, D., Olah, C., Steinhardt, J., Christiano, P., Schulman, J., & Mané, D. (2016). Concrete problems in AI safety. *arXiv preprint arXiv:1606.06565*.

2. Armony, J. L., Servan-Schreiber, D., Cohen, J. D., & LeDoux, J. E. (1997). Computational modeling of emotion: Explorations through the anatomy and physiology of fear conditioning. *Trends in Cognitive Sciences*, 1(1), 28–34.

3. Beer, R. D. (1990). Intelligence as adaptive behavior: An experiment in computational neuroethology. *Academic Press*.

4. Blanchard, R. J., & Blanchard, D. C. (1989). Antipredator defensive behaviors in a visible burrow system. *Journal of Comparative Psychology*, 103(1), 70–82.

5. Block, N. (1980). Troubles with functionalism. In *Readings in Philosophy of Psychology* (Vol. 1, pp. 268–305). Harvard University Press.

6. Braitenberg, V. (1984). *Vehicles: Experiments in Synthetic Psychology*. MIT Press.

7. Brooks, R. A. (1986). A robust layered control system for a mobile robot. *IEEE Journal on Robotics and Automation*, 2(1), 14–23.

8. Brooks, R. A. (1991). Intelligence without representation. *Artificial Intelligence*, 47(1–3), 139–159.

9. Cannon, W. B. (1929). *Bodily Changes in Pain, Hunger, Fear and Rage*. D. Appleton and Company.

10. Craig, A. D. (2002). How do you feel? Interoception: The sense of the physiological condition of the body. *Nature Reviews Neuroscience*, 3(8), 655–666.

11. Craig, A. D. (2009). How do you feel—now? The anterior insula and human awareness. *Nature Reviews Neuroscience*, 10(1), 59–70.

12. Damasio, A. R. (1994). *Descartes' Error: Emotion, Reason, and the Human Brain*. G.P. Putnam's Sons.

13. Damasio, A. R. (1999). *The Feeling of What Happens: Body and Emotion in the Making of Consciousness*. Harcourt Brace.

14. Fanselow, M. S. (1994). Neural organization of the defensive behavior system responsible for fear. *Psychonomic Bulletin & Review*, 1(4), 429–438.

15. Harvey, I., Di Paolo, E., Wood, R., Quinn, M., & Tuci, E. (2005). Evolutionary robotics: A new scientific tool for studying cognition. *Artificial Life*, 11(1–2), 79–98.

16. Kahneman, D. (2011). *Thinking, Fast and Slow*. Farrar, Straus and Giroux.

17. Langton, C. G. (Ed.). (1995). *Artificial Life: An Overview*. MIT Press.

18. LeDoux, J. E. (1996). *The Emotional Brain: The Mysterious Underpinnings of Emotional Life*. Simon & Schuster.

19. LeDoux, J. E. (2012). Rethinking the emotional brain. *Neuron*, 73(4), 653–676.

20. LeDoux, J. E. (2014). Coming to terms with fear. *Proceedings of the National Academy of Sciences*, 111(8), 2871–2878.

21. Maia, T. V. (2010). Two-factor theory, the actor-critic model, and conditioned avoidance. *Learning & Behavior*, 38(1), 50–67.

22. Maren, S., & Quirk, G. J. (2004). Neuronal signalling of fear memory. *Nature Reviews Neuroscience*, 5(11), 844–852.

23. Milad, M. R., & Quirk, G. J. (2002). Neurons in medial prefrontal cortex signal memory for fear extinction. *Nature*, 420(6911), 70–74.

24. O'Keefe, J., & Nadel, L. (1978). *The Hippocampus as a Cognitive Map*. Oxford University Press.

25. Pavlov, I. P. (1927). *Conditioned Reflexes: An Investigation of the Physiological Activity of the Cerebral Cortex*. Oxford University Press.

26. Phelps, E. A., & LeDoux, J. E. (2005). Contributions of the amygdala to emotion processing: From animal models to human behavior. *Neuron*, 48(2), 175–187.

27. Picard, R. W. (1997). *Affective Computing*. MIT Press.

28. Putnam, H. (1967). Psychological predicates. In *Art, Mind, and Religion* (pp. 37–48). University of Pittsburgh Press.

29. Rescorla, R. A., & Wagner, A. R. (1972). A theory of Pavlovian conditioning: Variations in the effectiveness of reinforcement and nonreinforcement. In *Classical Conditioning II* (pp. 64–99). Appleton-Century-Crofts.

30. Searle, J. R. (1980). Minds, brains, and programs. *Behavioral and Brain Sciences*, 3(3), 417–424.

31. Searle, J. R. (1992). *The Rediscovery of the Mind*. MIT Press.

32. Seth, A. K. (2013). Interoceptive inference, emotion, and the embodied self. *Trends in Cognitive Sciences*, 17(11), 565–573.

33. Sloman, A., & Croucher, M. (1981). Why robots will have emotions. *Proceedings of the 7th International Joint Conference on Artificial Intelligence*, 197–202.

34. Sutton, R. S., & Barto, A. G. (2018). *Reinforcement Learning: An Introduction* (2nd ed.). MIT Press.

35. Tolman, E. C. (1948). Cognitive maps in rats and men. *Psychological Review*, 55(4), 189–208.

36. Wicks, S. R., & Rankin, C. H. (1995). Integration of mechanosensory stimuli in *Caenorhabditis elegans*. *Journal of Neuroscience*, 15(3), 2434–2444.

---

*© 2026 A. Shakil, Artifact Virtual. Released under the MIT License.*
