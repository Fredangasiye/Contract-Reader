const { getAnalysis } = require('./dataStorage');

/**
 * Letter Generator Service
 * Generates dispute letters based on contract analysis
 */

// Letter templates for different contract types and situations
const LETTER_TEMPLATES = {
    gym_cancellation: {
        subject: 'Request for Membership Cancellation',
        template: `Dear {gym_name},

I am writing to formally request the cancellation of my gym membership (Member ID: {member_id}) effective immediately.

{reason_section}

According to my membership agreement signed on {sign_date}, {contract_reference}. However, I have identified the following concerns with my membership terms:

{red_flags_section}

{legal_reference}

I request confirmation of this cancellation in writing within 10 business days. Please also confirm that no further charges will be made to my account after {cancellation_date}.

If you require any additional information, please contact me at {contact_info}.

Sincerely,
{user_name}
{date}`
    },

    insurance_claim_dispute: {
        subject: 'Formal Dispute of Claim Denial',
        template: `Dear {insurance_company},

I am writing to formally dispute the denial of my insurance claim (Claim Number: {claim_number}) dated {claim_date}.

{situation_description}

Upon careful review of my policy (Policy Number: {policy_number}), I have identified the following issues with the denial:

{red_flags_section}

{coverage_argument}

I am requesting a formal review of this decision and reconsideration of my claim. According to {state} insurance regulations, I have the right to appeal this decision.

Please provide:
1. A detailed written explanation of the denial
2. Specific policy language supporting the denial
3. Information about the appeals process

I expect a response within 30 days as required by law.

Sincerely,
{user_name}
{date}`
    },

    lease_violation: {
        subject: 'Notice of Lease Violation and Request for Remedy',
        template: `Dear {landlord_name},

I am writing to notify you of violations of our lease agreement for the property located at {property_address}.

{situation_description}

The following issues violate my rights as a tenant and/or the terms of our lease agreement:

{red_flags_section}

{legal_rights}

I am requesting that these issues be remedied within {remedy_period} days. Failure to address these violations may result in:
- Withholding of rent (where legally permitted)
- Filing a complaint with the local housing authority
- Legal action to enforce my rights

Please confirm receipt of this letter and your plan to address these concerns.

Sincerely,
{user_name}
{date}`
    },

    employment_negotiation: {
        subject: 'Request to Modify Employment Agreement Terms',
        template: `Dear {employer_name},

Thank you for the employment offer for the position of {position}. I am excited about the opportunity to join {company_name}.

After carefully reviewing the employment agreement, I would like to discuss the following terms before signing:

{concerns_section}

I have identified several clauses that I believe require clarification or modification:

{red_flags_section}

I would appreciate the opportunity to discuss these points and find mutually agreeable terms. I am confident we can reach an arrangement that works for both parties.

Please let me know your availability for a discussion.

Best regards,
{user_name}
{date}`
    },

    service_cancellation: {
        subject: 'Service Cancellation Request',
        template: `Dear {service_provider},

I am writing to cancel my service agreement (Account Number: {account_number}) effective {cancellation_date}.

{reason_section}

According to the terms of service, {cancellation_terms}. However, I have noted the following concerns:

{red_flags_section}

Please confirm:
1. Cancellation effective date
2. Final billing amount
3. Return of any deposits or prepaid amounts
4. Cancellation of automatic payments

I expect written confirmation within 5 business days.

Sincerely,
{user_name}
{date}`
    },

    other_dispute: {
        subject: 'Formal Dispute Letter',
        template: `Dear {recipient_name},

I am writing regarding a dispute with {recipient_company}.

{dispute_details}

{red_flags_section}

I request that you address this matter immediately. Please provide a written response within 10 business days.

Sincerely,
{user_name}
{date}`
    }
};

/**
 * Generate a dispute letter based on contract analysis and user input
 */
async function generateLetter(params) {
    const {
        contractId,
        letterType,
        userInfo,
        customData
    } = params;

    // Get contract analysis if provided
    let analysis = null;
    if (contractId) {
        analysis = await getAnalysis(contractId);
    }

    // Select appropriate template
    const template = LETTER_TEMPLATES[letterType];
    if (!template) {
        throw new Error(`Unknown letter type: ${letterType}`);
    }

    // Build red flags section from analysis
    let redFlagsSection = '';
    if (analysis && analysis.flags && analysis.flags.length > 0) {
        redFlagsSection = analysis.flags
            .filter(flag => flag.severity >= 50) // Medium severity and above
            .map((flag, index) => `${index + 1}. ${flag.title}: ${flag.description}`)
            .join('\n\n');
    } else if (customData.redFlags) {
        redFlagsSection = customData.redFlags;
    }

    // Build reason section
    let reasonSection = '';
    if (customData.reason) {
        reasonSection = `The reason for this request is: ${customData.reason}`;
    }

    // Build situation description
    let situationDescription = customData.situation || '';

    // Prepare replacements
    const replacements = {
        // User info
        user_name: userInfo.name || '[Your Name]',
        contact_info: userInfo.email || userInfo.phone || '[Your Contact Information]',
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),

        // Custom data
        ...customData,

        // Generated sections
        red_flags_section: redFlagsSection || '[Specific concerns from your contract]',
        reason_section: reasonSection,
        situation_description: situationDescription,

        // Dates
        cancellation_date: customData.cancellationDate || new Date().toLocaleDateString(),

        // Legal references (simplified - would be more sophisticated in production)
        legal_reference: getLegalReference(letterType, customData.state),
        legal_rights: getLegalRights(letterType, customData.state),
        coverage_argument: getCoverageArgument(customData),
        contract_reference: getContractReference(analysis)
    };

    // Replace placeholders in template
    let letter = template.template;
    for (const [key, value] of Object.entries(replacements)) {
        const placeholder = `{${key}}`;
        letter = letter.replace(new RegExp(placeholder, 'g'), value || `[${key}]`);
    }

    return {
        subject: template.subject,
        content: letter,
        generatedAt: new Date().toISOString()
    };
}

/**
 * Get legal reference based on letter type and state
 */
function getLegalReference(letterType, state) {
    const references = {
        gym_cancellation: `Under ${state || 'your state'} consumer protection laws, I have the right to cancel this membership.`,
        insurance_claim_dispute: `According to ${state || 'state'} insurance regulations and the terms of my policy, this claim should be covered.`,
        lease_violation: `Under ${state || 'state'} landlord-tenant law, landlords are required to maintain habitable living conditions.`,
        employment_negotiation: `I believe these terms may not be in compliance with ${state || 'state'} employment law.`,
        service_cancellation: `Consumer protection laws in ${state || 'your state'} provide for reasonable cancellation terms.`
    };

    return references[letterType] || '';
}

/**
 * Get legal rights statement
 */
function getLegalRights(letterType, state) {
    const rights = {
        lease_violation: `As a tenant, I have the right to:
- A habitable living space
- Privacy and proper notice before entry
- Protection from discrimination
- Due process before eviction
- Return of security deposit under specified conditions`
    };

    return rights[letterType] || '';
}

/**
 * Get coverage argument for insurance disputes
 */
function getCoverageArgument(customData) {
    if (customData.coverageArgument) {
        return customData.coverageArgument;
    }

    return `Based on my understanding of the policy terms, this claim falls within the scope of coverage because ${customData.coverageReason || '[explain why this should be covered]'}.`;
}

/**
 * Get contract reference from analysis
 */
function getContractReference(analysis) {
    if (!analysis) {
        return 'the contract states that';
    }

    // Try to extract relevant contract language
    // This is simplified - would use more sophisticated NLP in production
    return 'the contract includes provisions regarding';
}

/**
 * Get available letter templates
 */
function getLetterTemplates() {
    return Object.keys(LETTER_TEMPLATES).map(key => ({
        id: key,
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        subject: LETTER_TEMPLATES[key].subject
    }));
}

module.exports = {
    generateLetter,
    getLetterTemplates,
    LETTER_TEMPLATES
};
