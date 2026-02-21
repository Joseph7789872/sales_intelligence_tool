import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { QualityScoreBadge } from './QualityScoreBadge';
import { FeedbackButtons } from './FeedbackButtons';
import type { Playbook } from '@/types/api';

interface PlaybookDetailProps {
  playbook: Playbook;
  analysisId: string;
}

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

function SectionHeading({ title }: { title: string }) {
  return (
    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
      {title}
    </h4>
  );
}

export function PlaybookDetail({ playbook, analysisId }: PlaybookDetailProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(playbook.coldEmail.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pt-4"
    >
      {/* Header: Quality Score + Feedback */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between"
      >
        <QualityScoreBadge score={playbook.qualityScore} />
        <FeedbackButtons
          playbookId={playbook.id}
          currentFeedback={playbook.userFeedback}
          analysisId={analysisId}
        />
      </motion.div>

      {/* 1. Cold Email */}
      <motion.div variants={itemVariants} className="border-t border-border pt-4">
        <SectionHeading title="Cold Email" />
        <div className="rounded-lg bg-surface-100 p-3">
          <p className="text-xs text-text-muted">Subject</p>
          <p className="mt-0.5 text-sm font-medium text-text-primary">
            {playbook.coldEmail.subject}
          </p>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Body</p>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
            {playbook.coldEmail.body}
          </p>
        </div>
        <div className="mt-3 rounded-lg bg-surface-100 p-3">
          <p className="text-xs text-text-muted">Follow-up</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {playbook.coldEmail.followUp}
          </p>
        </div>
      </motion.div>

      {/* 2. Discovery Questions */}
      <motion.div variants={itemVariants} className="border-t border-border pt-4">
        <SectionHeading title="Discovery Questions" />
        <ol className="space-y-2">
          {playbook.discoveryQuestions.map((q, i) => (
            <li key={i} className="flex gap-3 text-sm text-text-secondary">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">
                {i + 1}
              </span>
              <span>{q}</span>
            </li>
          ))}
        </ol>
      </motion.div>

      {/* 3. Pain Points */}
      <motion.div variants={itemVariants} className="border-t border-border pt-4">
        <SectionHeading title="Pain Points" />
        <div className="space-y-3">
          {playbook.painPoints.map((pp, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-text-primary">
                {pp.painPoint}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">{pp.relevance}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 4. Objection Handling */}
      <motion.div variants={itemVariants} className="border-t border-border pt-4">
        <SectionHeading title="Objection Handling" />
        <div className="space-y-4">
          {playbook.objectionHandling.map((oh, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-warning">
                &ldquo;{oh.objection}&rdquo;
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {oh.response}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 5. Champion Persona */}
      <motion.div variants={itemVariants} className="border-t border-border pt-4">
        <SectionHeading title="Champion Persona" />
        <p className="text-sm font-medium text-text-primary">
          {playbook.championPersona.role}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-text-muted">Motivations</p>
            <ul className="mt-1 space-y-1">
              {playbook.championPersona.motivations.map((m, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-secondary">
                  <span className="text-success">&#8226;</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-text-muted">Buying Triggers</p>
            <ul className="mt-1 space-y-1">
              {playbook.championPersona.buyingTriggers.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-secondary">
                  <span className="text-warning">&#8226;</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

      {/* 6. Predicted Timeline */}
      <motion.div variants={itemVariants} className="border-t border-border pt-4">
        <SectionHeading title="Predicted Timeline" />
        <div className="relative py-2 pl-8">
          <div className="absolute bottom-2 left-[15px] top-2 w-0.5 bg-border" />
          {playbook.predictedTimeline.stages.map((stage, i) => {
            const isLast =
              i === playbook.predictedTimeline.stages.length - 1;
            return (
              <div key={i} className="relative mb-4 last:mb-0">
                <div
                  className={`absolute -left-8 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                    isLast
                      ? 'border-2 border-accent bg-surface'
                      : 'bg-success'
                  }`}
                >
                  {!isLast && (
                    <svg
                      className="h-2 w-2 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-text-primary">
                    {stage.stage}
                  </p>
                  <span className="text-xs text-text-muted">
                    Day {stage.day}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 border-t border-border pt-2 text-xs text-text-secondary">
          Estimated days to close:{' '}
          <span className="font-medium text-text-primary">
            {playbook.predictedTimeline.daysToClose} days
          </span>
        </div>
      </motion.div>

      {/* 7. Case Study Reference */}
      <motion.div variants={itemVariants} className="border-t border-border pt-4">
        <SectionHeading title="Case Study Reference" />
        <div className="rounded-lg bg-surface-100 p-4">
          <p className="text-sm font-medium text-text-primary">
            {playbook.caseStudyRef.company}
            <span className="ml-2 text-xs text-text-muted">
              {playbook.caseStudyRef.industry}
            </span>
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {playbook.caseStudyRef.result}
          </p>
          <blockquote className="mt-3 border-l-2 border-accent pl-3 text-sm italic text-text-muted">
            {playbook.caseStudyRef.quote}
          </blockquote>
        </div>
      </motion.div>
    </motion.div>
  );
}
