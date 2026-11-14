# Recommendation Mapping: Translating Cognitive Science into Burnout Radarr

> **Document Purpose:**  
> This document maps empirical findings from three peer-reviewed studies (Yuriev et al., 2026; Blasche et al., 2023; Gonçales et al., 2021) into concrete, actionable feature recommendations for Burnout Radarr's **Student Mode**, **Developer Mode**, and core **Cognitive Fatigue Index (CFI)** engine.

---

## 1. Scientific & Conceptual Guardrails

Before mapping findings into application recommendations, Burnout Radarr must respect four strict psychophysiological boundaries established by cognitive and occupational science:

```
+---------------------------------------------------------------------------------------+
|                                    TIME HORIZON                                       |
|                    Short-Term / Transient       Long-Term / Cumulative                |
+------------------+----------------------------+----------------------------------------+
|                  | 1. COGNITIVE LOAD          | 2. ACUTE MENTAL FATIGUE                |
|                  | Working-memory demand      | Psychophysiological depletion          |
| ENERGETIC /      | during a task (NASA-TLX,   | resulting from prolonged mental work   |
| CAPACITY         | EEG theta/alpha, pupil     | (>4-6h/day). Restored by sleep/rest.   |
| DIMENSION        | dilation).                 | (Blasche et al., 2023)                 |
|                  | (Gonçales et al., 2021)    |                                        |
+------------------+----------------------------+----------------------------------------+
|                  | 3. PSYCHOLOGICAL DISTRESS  | 4. CHRONIC BURNOUT                     |
|                  | Subjective tension, mood   | Clinical exhaustion, cynicism, and     |
| AFFECTIVE /      | disturbance, and anxiety   | reduced professional efficacy over     |
| EMOTIONAL        | (elevated by exam date     | months of unmitigated work stress.     |
| DIMENSION        | proximity or work demand). | (Not directly measured in these papers)|
|                  | (Blasche et al., 2023)     |                                        |
+------------------+----------------------------+----------------------------------------+
```

### Critical Rules for Burnout Radarr:
1. **Never Confuse Fatigue with Burnout:** A user logging 7 hours of study has *high acute mental fatigue*, not necessarily clinical burnout. CFI must be framed as a *fatigue risk and pacing indicator*, never a clinical diagnostic tool.
2. **Never Treat Correlation as Causation:** Regression models (e.g., GEE linear models) indicate statistical associations, not immutable deterministic laws. Individual resilience, interest, and prior experience vary.
3. **No Rigid Universal Thresholds:** Do not hardcode a single CFI cutoff (e.g. "CFI > 75 = Burnout"). Instead, present personalized warnings, pacing suggestions, and recovery reminders.
4. **No Direct JEE/NEET Equivalence:** The Blasche study investigated 49 Austrian medical students. While the cognitive mechanisms of exam strain and study duration are broadly relevant, Burnout Radarr must not misrepresent these as empirical studies of Indian JEE/NEET aspirants.

---

## 2. Student Mode Recommendations

### 2.1 Daily Study Duration Envelope & Tiered Warnings
- **Evidence Base:** Blasche et al. (2023) demonstrated through GEE modeling that preceding-day study durations of **1–4 hours** do not significantly elevate next-day acute fatigue compared to rest days ($p > 0.05$). However, fatigue increases significantly at **5–6 hours** ($p = 0.009$) and escalates strongly at **>6 hours** ($p < 0.001$, Wald $\chi^2 = 26.3$).
- **Application Feature:**
  - **Optimal Focus Envelope (0–4 Hours Cumulative Daily):** Visual indicator remains green ("Healthy Focus Zone").
  - **Cognitive Strain Warning (4–6 Hours Cumulative Daily):** Visual indicator turns amber; app suggests wrapping up high-load conceptual tasks and transitioning to light review or physical break.
  - **Fatigue Escalation Alert (>6 Hours Cumulative Daily):** Visual indicator turns red; app actively advises ending intensive sessions for the day, noting that additional hours yield steep next-day cognitive carryover fatigue.

### 2.2 Preserving "Zero-Work" Rest Days (Distress Reset)
- **Evidence Base:** Blasche et al. (2023) discovered that psychological distress was significantly higher on days following study ($1–2\text{ h}: p = 0.004$; $>6\text{ h}: p < 0.001$; Wald $\chi^2 = 44.2$) compared to 0-hour rest days. Full rest days are essential to reset baseline affective strain.
- **Application Feature:**
  - **Rest Day Recommendation:** If a user logs 6 consecutive days of study without a break, the app surfaces an empathetic suggestion: *"Research shows that taking a full zero-study rest day significantly resets psychological distress and prevents fatigue buildup. Consider a rest or active-recovery day tomorrow."*
  - **Guilt-Free Streak Protection:** Prevent users from losing their session streaks or feeling penalized if they log a scheduled rest day.

### 2.3 Spaced Retrieval Practice Over Passive Cramming
- **Evidence Base:** Yuriev et al. (2026) confirmed across 65 STEM studies that spaced retrieval practice dramatically outperforms passive re-reading, highlighting that passive habits create an "illusion of competence" while decaying rapidly.
- **Application Feature:**
  - **Active Recall Prompt in Session Setup:** When configuring a study session, offer a strategy toggle: *"Session Strategy: Spaced Retrieval vs. Review"*.
  - **End-of-Session Retrieval Micro-Check:** Instead of just stopping the clock, prompt the student: *"Take 2 minutes to write down 3 key concepts from memory before opening your notes."*

### 2.4 Interleaved Study Block Recommendations
- **Evidence Base:** Yuriev et al. (2026) noted that interleaving distinct problem sets improves cognitive categorization and discrimination skills, though students often resist it because it feels harder.
- **Application Feature:**
  - **Interleaving Suggestion:** When a student schedules an extended study block (e.g., 3 hours), suggest splitting it into two distinct subjects/topics (e.g., 90 min Calculus problem-solving + 60 min Physics concept review) rather than 3 continuous hours of identical drills.

### 2.5 Exam Proximity Scaling & Non-Linear Stress Buffer
- **Evidence Base:** Blasche et al. (2023) found that proximity to an exam strongly increases distress ($p < 0.001$) and fatigue ($p < 0.05$) while suppressing vigor ($p < 0.05$) along a non-linear power curve.
- **Application Feature:**
  - **Exam Date Countdown:** Allow students to optionally input their target exam date.
  - **Countdown Adaptation:** Within 7 days of the exam, automatically scale down recommended daily study hours and emphasize sleep preservation and low-stress retrieval drills rather than marathon cramming.

---

## 3. Developer Mode Recommendations

### 3.1 Task-Specific Cognitive Weighting
- **Evidence Base:** Gonçales et al. (2021) found across 63 empirical SE studies that **code comprehension and debugging** elicit the highest cognitive load, working-memory strain, and NASA-TLX frustration scores compared to boilerplate or routine coding.
- **Application Feature:**
  - **Task-Type Selector:** In Developer session setup, provide task options:
    - *Debugging / Bug Hunting* (High Cognitive Weight: 1.3x)
    - *Architecture / Code Comprehension* (High Cognitive Weight: 1.2x)
    - *Feature Development* (Standard Cognitive Weight: 1.0x)
    - *Refactoring / Testing* (Moderate Cognitive Weight: 0.9x)
    - *Documentation / Routine Maintenance* (Low Cognitive Weight: 0.7x)
  - **Shorter Recommended Max Durations for Debugging:** Recommend 45–60 minute sessions for debugging to prevent cognitive tunneling and frustration escalation.

### 3.2 NASA-TLX Inspired Lightweight Post-Session Check-in
- **Evidence Base:** Gonçales et al. (2021) identified NASA-TLX as the gold standard for subjective mental workload assessment in software engineering.
- **Application Feature:**
  - **2-Question Micro-Survey (Post-Session):**
    1. *Mental Demand:* "How mentally demanding was this session?" (1–5 scale)
    2. *Frustration Level:* "Did you encounter blocking obstacles or high friction?" (1–5 scale)
  - Integrating these two dimensions provides an empirically grounded cognitive load rating without the friction of a full 20-question battery.

### 3.3 Interruption Defense & Context Switching Mitigation
- **Evidence Base:** Gonçales et al. (2021) highlighted that frequent context switches degrade developers' mental execution models, multiplying extraneous load and defect injection.
- **Application Feature:**
  - **Focus Shielding:** Encourage uninterrupted 50–90 minute deep-work blocks.
  - **Checkpoint Marker:** If a developer needs to interrupt a session, provide a 1-click "Quick Checkpoint" note capture to offload mental state before switching tasks.

### 3.4 Heuristic Load Estimation vs. Brittle ML Black Boxes
- **Evidence Base:** Gonçales et al. (2021) revealed that while 51% of academic studies attempt ML cognitive load classification, real-world precision plummets outside laboratory conditions due to ambient noise, multiple screens, and motion artifacts.
- **Application Feature:**
  - **Transparent Rule-Based Metrics:** Base CFI on transparent, explainable indicators (active duration, task complexity, user check-ins, sleep) rather than speculative sensor-driven ML predictions.

---

## 4. Algorithmic Recommendations for CFI (Cognitive Fatigue Index)

To ground Burnout Radarr's CFI calculation in empirical evidence:

### 4.1 Non-Linear Duration Penalty Function
Rather than a purely linear duration multiplier, apply a piecewise or quadratic penalty reflecting the empirical finding that strain accelerates after 4 hours and spikes past 6 hours:
$$\text{Duration Factor} = \begin{cases} 
1.0 \times \text{Hours} & \text{if Hours} \le 4 \\
4.0 + 1.5 \times (\text{Hours} - 4) & \text{if } 4 < \text{Hours} \le 6 \\
7.0 + 2.5 \times (\text{Hours} - 6) & \text{if Hours} > 6 
\end{cases}$$

### 4.2 Nocturnal Sleep as a Critical Buffering Variable
- **Evidence Base:** Sleep duration significantly buffered morning fatigue in Blasche et al. ($p < 0.01$).
- **Implementation:** Include optional sleep duration entry. Sleeping $<6$ hours increases baseline morning CFI; sleeping $\ge 8$ hours applies a positive recovery dampener to accumulated fatigue.

### 4.3 Vigor Independence Guardrail
- **Evidence Base:** Blasche et al. proved that vigor does not drop merely because prior-day study duration was high ($p = 0.713$). Students can feel energetic while remaining vulnerable to acute fatigue.
- **Implementation:** The CFI algorithm must **never** assume that high subjective alertness/vigor negates acute fatigue risk.

---

## 5. Summary Table: Empirical Findings to Burnout Radarr Features

| Paper Reference | Empirical Finding | Target Mode | Burnout Radarr Feature |
| :--- | :--- | :--- | :--- |
| **Blasche et al. (2023)** | Study duration $>4\text{ h}$ increases fatigue; $>6\text{ h}$ causes steep spike ($p < 0.001$). | Student & Developer | Tiered warnings at 4h (Caution) and 6h (Fatigue Alert). |
| **Blasche et al. (2023)** | Even $1\text{--}2\text{ h}$ study increases next-day distress ($p = 0.004$) vs 0h rest days. | Student | Rest-day scheduler to encourage periodic zero-study days. |
| **Blasche et al. (2023)** | Sleep duration directly reduces morning fatigue ($p < 0.01$). | Both Modes | Sleep buffer credit in daily CFI calculation. |
| **Blasche et al. (2023)** | Exam proximity increases distress and fatigue on a power curve. | Student | Exam countdown date pacing; shifts focus to recovery near test date. |
| **Blasche et al. (2023)** | Vigor is decoupled from prior-day study duration ($p = 0.713$). | Both Modes | Do not use perceived alertness to cancel out accumulated fatigue warnings. |
| **Yuriev et al. (2026)** | Spaced retrieval practice significantly improves retention in STEM. | Student | In-session active recall prompts and retrieval check-ins. |
| **Yuriev et al. (2026)** | Passive re-reading creates illusory fluency and rapid memory decay. | Student | Actionable alerts on passive reading timers suggesting self-testing. |
| **Yuriev et al. (2026)** | Students resist effortful strategies unless structured/incentivized. | Student | Low-friction automated check-in micro-prompts. |
| **Gonçales et al. (2021)** | Debugging & code reading cause highest cognitive load and frustration. | Developer | Task complexity weighting (1.3x for debugging, 1.2x for architecture). |
| **Gonçales et al. (2021)** | NASA-TLX is the gold-standard subjective workload measure. | Developer | 2-item post-session micro-survey (Mental Demand + Frustration). |
| **Gonçales et al. (2021)** | Context switching disrupts working memory models in software engineering. | Developer | Focus session timer encouraging 45–90 min uninterrupted blocks. |
| **Gonçales et al. (2021)** | ML classification of cognitive load has low precision in real-world settings. | Developer | Transparent, rule-based heuristic indicators over fragile ML models. |
