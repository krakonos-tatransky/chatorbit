"use client";

import { createElement, useState, type FormEvent } from "react";

import { useLanguage } from "@/components/language/language-provider";
import { getHelpTranslation } from "@/lib/i18n/translations";
import { apiUrl } from "@/lib/api";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type HelpContentProps = {
  headingLevel?: HeadingTag;
  sectionHeadingLevel?: HeadingTag;
  cardHeadingLevel?: HeadingTag;
  headingId?: string;
  showHeading?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function HelpContent({
  headingLevel = "h1",
  sectionHeadingLevel,
  cardHeadingLevel,
  headingId = "help-page-title",
  showHeading = true,
}: HelpContentProps) {
  const { language } = useLanguage();
  const t = getHelpTranslation(language);
  const { heading, intro, troubleshootingTitle, troubleshootingDescription, sections, contactForm: ct } = t;
  const HeadingTag = headingLevel;
  const SectionHeadingTag: HeadingTag = sectionHeadingLevel ?? (headingLevel === "h1" ? "h2" : "h3");
  const CardHeadingTag: HeadingTag = cardHeadingLevel ?? (SectionHeadingTag === "h2" ? "h3" : "h4");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(ct.subjectOptions[0].value);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = ct.required;
    if (!email.trim()) next.email = ct.required;
    else if (!EMAIL_RE.test(email.trim())) next.email = ct.invalidEmail;
    if (!message.trim()) next.message = ct.required;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setStatus("sending");
    try {
      const res = await fetch(apiUrl("/api/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject, message: message.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setName("");
      setEmail("");
      setSubject(ct.subjectOptions[0].value);
      setMessage("");
      setErrors({});
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <div className="help-page__intro">
        {showHeading ? createElement(HeadingTag, { id: headingId }, heading) : null}
        <p>{intro}</p>
      </div>
      <section className="help-page__topic" aria-labelledby="video-troubleshooting">
        {createElement(SectionHeadingTag, { id: "video-troubleshooting" }, troubleshootingTitle)}
        <p>{troubleshootingDescription}</p>
        <div className="help-page__topics">
          {sections.map((section) => (
            <article key={section.id} className="help-page__card">
              {createElement(CardHeadingTag, { id: `help-${section.id}` }, section.title)}
              <ol>
                {section.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="help-page__contact" aria-labelledby="contact-support">
        {createElement(SectionHeadingTag, { id: "contact-support" }, ct.title)}
        <p>{ct.description}</p>

        {status === "success" ? (
          <p className="help-page__contact-success">{ct.success}</p>
        ) : (
          <form className="help-page__contact-form" onSubmit={handleSubmit} noValidate>
            <div className="help-page__contact-field">
              <input
                type="text"
                placeholder={ct.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
              />
              {errors.name && <span className="help-page__contact-error">{errors.name}</span>}
            </div>

            <div className="help-page__contact-field">
              <input
                type="email"
                placeholder={ct.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && <span className="help-page__contact-error">{errors.email}</span>}
            </div>

            <div className="help-page__contact-field">
              <label htmlFor="contact-subject">{ct.subjectLabel}</label>
              <select id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
                {ct.subjectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="help-page__contact-field">
              <textarea
                placeholder={ct.messagePlaceholder}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={!!errors.message}
              />
              {errors.message && <span className="help-page__contact-error">{errors.message}</span>}
            </div>

            {status === "error" && <p className="help-page__contact-error">{ct.error}</p>}

            <button type="submit" disabled={status === "sending"}>
              {status === "sending" ? ct.sending : ct.send}
            </button>
          </form>
        )}
      </section>
    </>
  );
}
