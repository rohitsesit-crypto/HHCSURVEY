"use client";

import { useEffect, useState } from "react";
import LivePhotoCapture from "./LivePhotoCapture";
import { CheckIcon, WarningIcon } from "./icons";
import {
  DEFAULT_EMAIL_ADDRESS,
  EMPTY_SURVEY,
  ORG_TYPES,
  PROPOSAL_TYPES,
  SELECT_TYPES,
  SHEET_TAB_NAME,
  toSheetPayload,
  validateSurvey,
  type FormErrors,
  type SurveyFormValues,
} from "@/lib/form-config";
import { toMapsLink, useLivePhoto } from "@/lib/use-live-photo";

type SubmitState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; row: number | null }
  | { kind: "error"; message: string };

export default function SurveyForm() {
  const [values, setValues] = useState<SurveyFormValues>(EMPTY_SURVEY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });
  const photo = useLivePhoto();

  const isProposal = values.selectType === "Proposal";

  // Clear a field's error as soon as the user starts fixing it.
  function setField(field: keyof SurveyFormValues, value: string) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "selectType" && value !== "Proposal") next.proposalType = "";
      return next;
    });
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  useEffect(() => {
    if (photo.photo && errors.photo) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.photo;
        return next;
      });
    }
  }, [photo.photo, errors.photo]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateSurvey(values, Boolean(photo.photo));
    setErrors(found);

    if (Object.keys(found).length > 0) {
      setSubmit({
        kind: "error",
        message: "Please correct the highlighted fields before submitting.",
      });
      const firstKey = Object.keys(found)[0];
      document
        .querySelector(`[data-field="${firstKey}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmit({ kind: "saving" });
    const payload = toSheetPayload(
      values,
      photo.photo as string,
      toMapsLink(photo.coords),
      photo.coords,
    );

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        row?: number | null;
      };

      if (!response.ok || !data.ok) {
        setSubmit({
          kind: "error",
          message: data.error ?? "Submission failed. Please try again.",
        });
        return;
      }

      setSubmit({ kind: "saved", row: data.row ?? null });
      setValues(EMPTY_SURVEY);
      setErrors({});
      photo.reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmit({
        kind: "error",
        message: "Network error. Check your connection and submit again.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {submit.kind === "saved" && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <CheckIcon className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Response saved to Google Sheets.</p>
            <p className="mt-0.5">
              Added to the “{SHEET_TAB_NAME}” tab
              {submit.row ? ` on row ${submit.row}` : ""}. You can enter the next response below.
            </p>
          </div>
        </div>
      )}

      {submit.kind === "error" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
        >
          <WarningIcon className="mt-0.5 size-5 shrink-0" />
          <p>{submit.message}</p>
        </div>
      )}

      <Fieldset
        title="Personal details"
        description="Basic information about the respondent."
      >
        <TextField
          label="Name"
          field="name"
          value={values.name}
          error={errors.name}
          onChange={setField}
          required
          autoComplete="name"
        />
        <TextField
          label="Designation"
          field="designation"
          value={values.designation}
          error={errors.designation}
          onChange={setField}
          required
          autoComplete="organization-title"
        />
        <TextField
          label="Date of Birth"
          field="dob"
          type="date"
          value={values.dob}
          error={errors.dob}
          onChange={setField}
          hint="Optional"
        />
        <TextField
          label="Mobile"
          field="mobile"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={values.mobile}
          error={errors.mobile}
          onChange={(field, value) =>
            setField(field, value.replace(/\D/g, "").slice(0, 10))
          }
          required
          autoComplete="tel"
          hint="10 digits"
        />
        <TextField
          label="Email ID"
          field="emailId"
          type="email"
          value={values.emailId}
          error={errors.emailId}
          onChange={setField}
          required
          autoComplete="email"
        />
        <TextField
          label="Address"
          field="address"
          value={values.address}
          error={errors.address}
          onChange={setField}
          required
          autoComplete="street-address"
          multiline
        />
      </Fieldset>

      <Fieldset
        title="Organisation"
        description="Details about the site being surveyed."
      >
        <TextField
          label="Total Numbers of Flat/Room"
          field="totalFlats"
          inputMode="numeric"
          value={values.totalFlats}
          error={errors.totalFlats}
          onChange={(field, value) => setField(field, value.replace(/\D/g, ""))}
          required
        />
        <TextField
          label="Organisation Name"
          field="organizationName"
          value={values.organizationName}
          error={errors.organizationName}
          onChange={setField}
          required
        />
        <SelectField
          label="Organisation Type"
          field="organizationType"
          value={values.organizationType}
          error={errors.organizationType}
          onChange={setField}
          options={ORG_TYPES}
          placeholder="Select organisation type"
          required
        />
        <SelectField
          label="Select Type"
          field="selectType"
          value={values.selectType}
          error={errors.selectType}
          onChange={setField}
          options={SELECT_TYPES}
          placeholder="Select type"
          required
        />
        {isProposal && (
          <SelectField
            label="Proposal Type"
            field="proposalType"
            value={values.proposalType}
            error={errors.proposalType}
            onChange={setField}
            options={PROPOSAL_TYPES}
            placeholder="Select proposal type"
            required
          />
        )}
      </Fieldset>

      <LivePhotoCapture photo={photo} error={errors.photo} />

      <div className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          “Email Address” is always stored as{" "}
          <span className="font-medium text-slate-700">{DEFAULT_EMAIL_ADDRESS}</span>.
        </p>
        <button
          type="submit"
          disabled={submit.kind === "saving"}
          className="btn-primary w-full sm:w-auto"
        >
          {submit.kind === "saving" ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}

function Fieldset({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{description}</p>
      </header>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

interface TextFieldProps {
  label: string;
  field: keyof SurveyFormValues;
  value: string;
  onChange: (field: keyof SurveyFormValues, value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  inputMode?: "numeric" | "tel" | "text" | "email";
  maxLength?: number;
  autoComplete?: string;
}

function TextField({
  label,
  field,
  value,
  onChange,
  error,
  hint,
  type = "text",
  required = false,
  multiline = false,
  inputMode,
  maxLength,
  autoComplete,
}: TextFieldProps) {
  const id = `field-${field}`;
  return (
    <div className={multiline ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="text-rose-600"> *</span>}
        {hint && <span className="ml-1 font-normal text-slate-400">({hint})</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          data-field={field}
          rows={3}
          value={value}
          onChange={(event) => onChange(field, event.target.value)}
          className={error ? "field-input field-input-error" : "field-input"}
          aria-invalid={Boolean(error)}
        />
      ) : (
        <input
          id={id}
          data-field={field}
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(field, event.target.value)}
          className={error ? "field-input field-input-error" : "field-input"}
          aria-invalid={Boolean(error)}
        />
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  field: keyof SurveyFormValues;
  value: string;
  options: readonly string[];
  placeholder: string;
  onChange: (field: keyof SurveyFormValues, value: string) => void;
  error?: string;
  required?: boolean;
}

function SelectField({
  label,
  field,
  value,
  options,
  placeholder,
  onChange,
  error,
  required = false,
}: SelectFieldProps) {
  const id = `field-${field}`;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      <select
        id={id}
        data-field={field}
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        className={error ? "field-input field-input-error" : "field-input"}
        aria-invalid={Boolean(error)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
