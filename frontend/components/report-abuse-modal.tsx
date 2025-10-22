"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";

type Stage = "warning" | "form" | "success";

type CheckboxField = "immediateThreat" | "involvesCriminalActivity" | "requiresFollowUp";
type TextField = "reporterEmail" | "summary" | "additionalDetails";

export type ReportAbuseFormValues = {
  reporterEmail: string;
  summary: string;
  immediateThreat: boolean;
  involvesCriminalActivity: boolean;
  requiresFollowUp: boolean;
  additionalDetails: string;
};

type ReportAbuseModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ReportAbuseFormValues) => Promise<void>;
};

const INITIAL_VALUES: ReportAbuseFormValues = {
  reporterEmail: "",
  summary: "",
  immediateThreat: false,
  involvesCriminalActivity: false,
  requiresFollowUp: false,
  additionalDetails: "",
};

export function ReportAbuseModal({ open, onClose, onSubmit }: ReportAbuseModalProps) {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<Stage>("warning");
  const [values, setValues] = useState<ReportAbuseFormValues>(INITIAL_VALUES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const descriptionId = useId();
  const summaryId = useId();
  const emailId = useId();
  const additionalDetailsId = useId();
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setStage("warning");
      setValues(INITIAL_VALUES);
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, onClose, open]);

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }
    if (stage === "warning") {
      initialFocusRef.current?.focus();
    } else if (stage === "form") {
      emailInputRef.current?.focus();
    }
  }, [mounted, open, stage]);

  const handleCheckboxChange = (field: CheckboxField) =>
    () => {
      setValues((previous) => ({
        ...previous,
        [field]: !previous[field],
      }));
    };

  const handleChange = (field: TextField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((previous) => ({
        ...previous,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
      setStage("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const warningContent = useMemo(
    () => (
      <div className="report-modal__panel" role="document" aria-describedby={descriptionId}>
        <header className="report-modal__header">
          <h2 className="report-modal__title">Report abusive or illegal behavior</h2>
        </header>
        <div className="report-modal__body">
          <p id={descriptionId}>
            Abuse reports are taken extremely seriously. False or malicious reports may be shared with law enforcement
            and could lead to penalties. If you continue, the current session will be terminated and our team will
            investigate the incident. Please proceed only if you believe the activity may violate the law or our terms
            of service.
          </p>
          <p className="report-modal__note">
            If someone is in immediate danger, contact local emergency services first.
          </p>
        </div>
        <footer className="report-modal__actions">
          <button type="button" className="report-modal__cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="report-modal__proceed" onClick={() => setStage("form")} ref={initialFocusRef}>
            Continue
          </button>
        </footer>
      </div>
    ),
    [descriptionId, onClose],
  );

  const formContent = (
    <div className="report-modal__panel" role="document" aria-describedby={descriptionId}>
      <header className="report-modal__header">
        <h2 className="report-modal__title">Submit abuse report</h2>
        <p id={descriptionId} className="report-modal__description">
          Provide the details below so our incident response team can investigate. You will receive an email confirming
          the report once it has been recorded.
        </p>
      </header>
      <form className="report-modal__form" onSubmit={handleSubmit}>
        <label className="report-modal__field" htmlFor={emailId}>
          Contact email
          <input
            ref={emailInputRef}
            id={emailId}
            type="email"
            required
            value={values.reporterEmail}
            onChange={handleChange("reporterEmail")}
            placeholder="you@example.com"
          />
        </label>
        <label className="report-modal__field" htmlFor={summaryId}>
          Summary of the incident
          <textarea
            id={summaryId}
            required
            minLength={10}
            maxLength={2000}
            value={values.summary}
            onChange={handleChange("summary")}
            placeholder="Describe what happened and why it is abusive."
          />
        </label>
        <fieldset className="report-modal__fieldset">
          <legend>Questionnaire</legend>
          <label className="report-modal__checkbox">
            <input
              type="checkbox"
              checked={values.immediateThreat}
              onChange={handleCheckboxChange("immediateThreat")}
            />
            Someone may be in immediate danger.
          </label>
          <label className="report-modal__checkbox">
            <input
              type="checkbox"
              checked={values.involvesCriminalActivity}
              onChange={handleCheckboxChange("involvesCriminalActivity")}
            />
            The behavior may involve criminal activity.
          </label>
          <label className="report-modal__checkbox">
            <input
              type="checkbox"
              checked={values.requiresFollowUp}
              onChange={handleCheckboxChange("requiresFollowUp")}
            />
            I am willing to cooperate with a follow-up investigation.
          </label>
          <label className="report-modal__field" htmlFor={additionalDetailsId}>
            Additional context (optional)
            <textarea
              id={additionalDetailsId}
              maxLength={4000}
              value={values.additionalDetails}
              onChange={handleChange("additionalDetails")}
              placeholder="Any additional notes, evidence, or identifiers that may help our team."
            />
          </label>
        </fieldset>
        {error ? <p className="report-modal__error">{error}</p> : null}
        <footer className="report-modal__actions">
          <button type="button" className="report-modal__cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="report-modal__submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </footer>
      </form>
    </div>
  );

  const successContent = (
    <div className="report-modal__panel" role="document" aria-describedby={descriptionId}>
      <header className="report-modal__header">
        <h2 className="report-modal__title">Report received</h2>
      </header>
      <div className="report-modal__body">
        <p id={descriptionId}>
          Thank you. We have recorded the incident and ended the current session. A confirmation email has been sent to
          you—please keep it for your records. Our team will contact you if we need additional information.
        </p>
      </div>
      <footer className="report-modal__actions">
        <button type="button" className="report-modal__submit" onClick={onClose}>
          Close
        </button>
      </footer>
    </div>
  );

  if (!mounted || !open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <div className="report-modal" role="dialog" aria-modal="true">
        {stage === "warning" ? warningContent : stage === "form" ? formContent : successContent}
      </div>
    </div>,
    document.body,
  );
}
