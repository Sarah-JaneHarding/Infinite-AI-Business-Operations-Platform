# Pedagogy by phase

## What this document is, and what it is not

This is the **instructional stance** the system's agents adopt when generating lessons,
tasks and remediation — how something should be taught once CAPS has said what must be
taught and for how long.

It is not a curriculum. It contains no time allocations, no assessment weightings, no topic
sequences and no outcomes. Those are policy, they live in L0, and they come from the
ingested CAPS documents. See `SOURCE_DOCUMENTS.md`; none have been supplied yet.

**Where CAPS prescribes methodology, CAPS wins.** Several subject statements — Foundation
Phase literacy and numeracy in particular — specify pedagogical approaches directly. When
those documents are ingested, every section here must be reconciled against them, and
anything that conflicts is wrong and gets rewritten. This document is drafted first because
the engineering that consumes it can be built in parallel; it is not drafted instead.

This is professional instructional design, offered as a starting position for HoD and SMT
review. It is not ratified, and nothing here should reach a classroom before it is.

---

## The stance that runs through all three phases

Four commitments that shape every artefact the system generates, regardless of grade.

**Teach to the outcome, not to the activity.** Backward design: start from the evidence
that would show a learner has understood, then build the task that produces it. An activity
that is enjoyable and generates no evidence is a gap in the record, and MOD-02 cannot tier a
learner on a gap.

**Assume a real South African classroom.** Forty-plus learners, uneven textbook supply, no
guaranteed printing, learners taught in a language that is not their home language. A
pedagogy that only works in a well-resourced room is a pedagogy that fails most of the
schools this platform is for. This is why MOD-04 includes a Resource-Light Activity Agent
rather than treating that as a fallback.

**Language is a subject-teaching problem, not just a language-teaching problem.** A learner
doing mathematics in their second or third language faces a comprehension load before they
face a mathematical one. Every phase below treats language access as part of teaching the
subject.

**The teacher is the professional in the room.** Everything generated is a draft for a
teacher to accept, edit or reject. The edit is not a failure of the system — Stage 13 treats
it as the most valuable signal it receives.

---

## Foundation Phase (Grades R–3)

**What this phase is for.** Establishing the codes — decoding print, number sense,
handwriting, and the habits of being a learner. Almost everything later depends on it, and
gaps here compound faster than gaps anywhere else.

**Instructional approach**

- **Concrete → pictorial → abstract, in that order, without shortcuts.** A learner who
  manipulates objects, then draws them, then writes the number sentence has built something
  the symbol can attach to. Starting at the symbol produces learners who can perform
  procedures they cannot reason about, and that failure surfaces years later in the
  Intermediate Phase looking like a "word problem" problem.
- **Structured, systematic, cumulative literacy teaching.** Phonemic awareness and letter–
  sound correspondence taught explicitly and in a deliberate sequence, with decodable text
  that only uses correspondences already taught. Giving a beginner reader text they cannot
  decode teaches guessing.
- **Short cycles, high repetition, distributed practice.** Attention spans are short and
  retention needs spacing. Many brief encounters beat one long one.
- **Oral language before written.** Discussion, storytelling and vocabulary work precede
  writing about the same content, particularly where the LoLT is not the home language.
- **Play is instructional time, not a break from it.** Structured play with a stated
  learning intention is how this age group consolidates.

**What generated artefacts must respect**

Decodable-only reading passages where the learner is still learning to decode. Instructions
short and imperative. Visual load low. Handwriting space appropriate to developing motor
control. No worksheet that requires reading fluency the learner is still building — that
tests reading while claiming to test mathematics.

**Assessment stance.** Predominantly observational and formative. A four-year-old's
performance on a written test measures compliance and fine motor control as much as
understanding. Rubrics describe what the teacher observes, not what the learner writes.

---

## Intermediate Phase (Grades 4–6)

**What this phase is for.** The shift from learning to read to reading to learn — and the
point where a learner who has not made that shift begins to fall behind in every subject at
once.

**Instructional approach**

- **Explicit teaching of academic language.** Subject-specific vocabulary and text
  structures taught directly, not absorbed. This is the phase where content-area reading
  either becomes accessible or quietly stops being so.
- **Worked examples before independent practice, faded deliberately.** Novices learn more
  from studying a worked example than from struggling with an equivalent problem. The fading
  matters as much as the example: full worked example, then partially completed, then
  independent.
- **Retrieval practice as routine.** Frequent low-stakes recall, spaced and interleaved. It
  is also the cheapest source of the formative evidence MOD-02 needs to screen — retrieval
  practice and screening data are the same activity viewed twice.
- **Make reasoning visible.** Learners explain their thinking aloud and in writing. This is
  where misconceptions become diagnosable rather than merely wrong.
- **Multiple representations, connected explicitly.** A fraction as an area, a number line
  position, a ratio and a division. Learners who hold these separately have four fragile
  facts instead of one robust concept.

**What generated artefacts must respect**

Reading level checked against the grade band and the LoLT — measured, not estimated.
Vocabulary support built into the task rather than bolted on. Graded difficulty within a
worksheet so every learner has an entry point and none finishes in two minutes. Any answer
key independently verified before a teacher sees it.

**Assessment stance.** Formative dominates; formal tasks are spaced so they inform teaching
rather than only reporting it. Cognitive demand is deliberately spread — a task that is
entirely recall tells you nothing about who can reason, and one that is entirely reasoning
tells you nothing about who has the foundations.

---

## Senior Phase (Grades 7–9)

**What this phase is for.** Disciplinary thinking — a scientist and a historian ask
different questions of evidence — alongside the independence learners will need in the FET
phase, at an age when engagement is most fragile.

**Instructional approach**

- **Teach the discipline's habits, not only its content.** What counts as evidence, how a
  claim is warranted, how the field argues. Content without this produces learners who can
  recall science and cannot think scientifically.
- **Cognitive demand raised deliberately, with support faded on purpose.** Scaffolding that
  never comes down produces dependence. Removing it too fast produces failure. The fade
  should be planned rather than incidental.
- **Metacognition made explicit.** Planning, monitoring and self-checking taught as skills.
  These are what carry learners into FET, where the teaching thins out.
- **Genuine problems, real contexts.** South African contexts, currency and measures by
  default. Relevance is not decoration at this age — it is a precondition for engagement.
- **Structured collaboration.** Peer explanation is a strong learning mechanism when roles
  and outputs are defined, and a way of hiding when they are not.

**What generated artefacts must respect**

Items tagged by cognitive demand with a controlled spread. Extended-response tasks with
rubrics the learner sees before attempting. Contexts that do not assume affluence — a task
premised on a household having a car or a computer excludes learners before they read
question one. Extension work that goes deeper rather than simply providing more.

**Assessment stance.** Formal assessment carries real weight, so task quality matters
psychometrically as well as pedagogically. MOD-05's Assessment Quality Analyst computes
difficulty and discrimination for exactly this reason: an assessment that fails to
discriminate is not a measurement, whatever mark it produces.

---

## How this is used by the system

| Consumer                    | Use                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------- |
| CE-04 Unit Architect        | Backward design is the phase-independent stance above                               |
| CE-05 Lesson Plan Generator | Phase pedagogy shapes lesson structure and pacing                                   |
| CE-08 Differentiation Agent | Support and extension defined per phase, not generically                            |
| TB-01/03/04 (MOD-04)        | Artefact constraints per phase, especially readability and decodability             |
| TB-08 Remediation Pack      | Foundation Phase remediation returns to concrete; later phases target the sub-skill |
| PD-06 Micro-Course Composer | Courses on phase-appropriate practice                                               |

It is referenced by prompts, never pasted into them. When ratified it belongs in L0 as part
of the school's constitution, versioned and superseded like any other policy — which means a
school that disagrees with a stance here can change it, and the change is auditable.

## Status

**Draft, unratified.** Awaiting (1) reconciliation against CAPS methodology sections once
the subject statements are ingested, and (2) HoD and SMT review. Not to be used to generate
learner-facing material until both are done.
