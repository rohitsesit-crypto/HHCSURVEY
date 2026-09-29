/**
 * Single source of truth for the survey form's fields and dropdown options.
 * Keeping labels here guarantees the browser payload keys and the Google
 * Apps Script column mapping always agree.
 */

export const ORG_TYPES = ["Residential", "school/college"] as const;
export const SELECT_TYPES = ["Proposal", "None"] as const;
export const PROPOSAL_TYPES = ["Beyond CGPA", "LBD", "HR", "SRIJAN"] as const;

/** Column that is always written as-is, regardless of what the user typed. */
export const DEFAULT_EMAIL_ADDRESS = "dr.vrushalihhc@gmail.com";

/** Sheet tab that receives every submission. */
export const SHEET_TAB_NAME = "Form Responses 1";

export type OrgType = (typeof ORG_TYPES)[number];
export type SelectType = (typeof SELECT_TYPES)[number];
export type ProposalType = (typeof PROPOSAL_TYPES)[number];

export interface SurveyFormValues {
  name: string;
  designation: string;
  dob: string;
  mobile: string;
  emailId: string;
  address: string;
  totalFlats: string;
  organizationName: string;
  organizationType: string;
  selectType: string;
  proposalType: string;
}

export const EMPTY_SURVEY: SurveyFormValues = {
  name: "",
  designation: "",
  dob: "",
  mobile: "",
  emailId: "",
  address: "",
  totalFlats: "",
  organizationName: "",
  organizationType: "",
  selectType: "",
  proposalType: "",
};

export type FormErrors = Partial<Record<keyof SurveyFormValues | "photo", string>>;

/** Minimal shape of the GPS fix captured with the live image. */
export interface CapturedCoords {
  latitude: number;
  longitude: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validates the whole form. `photoCaptured` is checked separately because the
 * live image never lives inside the text state object.
 */
export function validateSurvey(
  values: SurveyFormValues,
  photoCaptured: boolean,
): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) errors.name = "Name is required.";
  if (!values.designation.trim()) errors.designation = "Designation is required.";

  if (values.dob && Number.isNaN(new Date(values.dob).getTime())) {
    errors.dob = "Enter a valid date.";
  }

  if (!values.mobile.trim()) {
    errors.mobile = "Mobile number is required.";
  } else if (!/^\d{10}$/.test(values.mobile.trim())) {
    errors.mobile = "Mobile number must be exactly 10 digits.";
  }

  if (!values.emailId.trim()) {
    errors.emailId = "Email ID is required.";
  } else if (!EMAIL_RE.test(values.emailId.trim())) {
    errors.emailId = "Enter a valid email address.";
  }

  if (!values.address.trim()) errors.address = "Address is required.";

  if (!values.totalFlats.trim()) {
    errors.totalFlats = "Total numbers of flat/room is required.";
  } else if (!/^\d+$/.test(values.totalFlats.trim())) {
    errors.totalFlats = "Enter numbers only.";
  }

  if (!values.organizationName.trim()) {
    errors.organizationName = "Organisation name is required.";
  }

  if (!values.organizationType) {
    errors.organizationType = "Select the organisation type.";
  }

  if (!values.selectType) errors.selectType = "Select a type.";

  if (values.selectType === "Proposal" && !values.proposalType) {
    errors.proposalType = "Select the proposal type.";
  }

  if (!photoCaptured) {
    errors.photo = "Capture a live image before submitting.";
  }

  return errors;
}

/**
 * Normalises raw values into the exact payload consumed by the Apps Script.
 *
 * `latitude`/`longitude` are sent so the script can resolve the exact location
 * name for the "Location_Name" column; `location` carries the Google Maps link
 * written to the "Location" column.
 */
export function toSheetPayload(
  values: SurveyFormValues,
  photoDataUrl: string,
  locationLink: string,
  coords: CapturedCoords | null,
): Record<string, string> {
  return {
    name: values.name.trim(),
    designation: values.designation.trim(),
    dob: values.dob ? values.dob : "",
    mobile: values.mobile.trim(),
    emailId: values.emailId.trim(),
    address: values.address.trim(),
    totalFlats: values.totalFlats.trim(),
    organizationName: values.organizationName.trim(),
    organizationType: values.organizationType,
    // "Proposal Type" is only meaningful for a Proposal submission.
    selectType: values.selectType,
    proposalType: values.selectType === "Proposal" ? values.proposalType : "",
    photo: photoDataUrl,
    location: locationLink,
    latitude: coords ? String(coords.latitude) : "",
    longitude: coords ? String(coords.longitude) : "",
  };
}
