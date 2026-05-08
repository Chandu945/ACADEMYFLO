export interface EnquiryNewPush {
  title: string;
  body: string;
  data: {
    type: 'ENQUIRY_NEW';
    academyId: string;
    enquiryId: string;
  };
}

export function buildEnquiryNewPush(params: {
  prospectName: string;
  mobileNumber: string;
  source: string | null;
  academyId: string;
  enquiryId: string;
}): EnquiryNewPush {
  // Source is shown when present so the body distinguishes a walk-in from a
  // referral or a website lead at a glance, without forcing the recipient
  // to open the app for context. Falls back to "New enquiry" tone when
  // source is unknown.
  const sourceSuffix = params.source ? ` via ${humanizeSource(params.source)}` : '';
  return {
    title: 'New enquiry',
    body: `${params.prospectName} (${params.mobileNumber}) just enquired${sourceSuffix}.`,
    data: {
      type: 'ENQUIRY_NEW',
      academyId: params.academyId,
      enquiryId: params.enquiryId,
    },
  };
}

function humanizeSource(source: string): string {
  switch (source) {
    case 'WALK_IN':
      return 'walk-in';
    case 'PHONE':
      return 'phone';
    case 'REFERRAL':
      return 'referral';
    case 'SOCIAL_MEDIA':
      return 'social media';
    case 'WEBSITE':
      return 'website';
    default:
      return source.toLowerCase().replace(/_/g, ' ');
  }
}
