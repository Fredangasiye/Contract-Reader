const { getAnalysis } = require('./dataStorage');
const { generateLetterContent } = require('./llmAnalysis');

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
 * Generate a letter based on type and user input
 * @param {string} letterType 
 * @param {Object} userInfo 
 * @param {Object} customData 
 * @returns {Object} { subject, content }
 */
async function generateLetter({ letterType, userInfo, customData }) {
    const templateData = LETTER_TEMPLATES[letterType];
    if (!templateData) {
        throw new Error('Invalid letter type');
    }

    let content = templateData.template;
    let subject = templateData.subject;

    // AI Enhancement: If contract text is provided in customData (from upload), generate specific content
    if (customData.contractText && (customData.reason || customData.situation || customData.dispute_details)) {
        const userSituation = customData.reason || customData.situation || customData.dispute_details;
        console.log(`Generating AI content for ${letterType}...`);

        const aiContent = await generateLetterContent(
            customData.contractText,
            letterType,
            userSituation
        );

        // Replace the user's raw input with the AI generated content in the template
        // We map the AI content to the appropriate placeholder based on letter type
        if (letterType === 'gym_cancellation') customData.reason_section = aiContent;
        else if (letterType === 'insurance_claim_dispute') customData.situation_description = aiContent;
        else if (letterType === 'lease_violation') customData.situation_description = aiContent;
        else if (letterType === 'employment_negotiation') customData.concerns_section = aiContent;
        else if (letterType === 'service_cancellation') customData.reason_section = aiContent;
        else if (letterType === 'other_dispute') customData.dispute_details = aiContent;
    }

    // Common placeholders
    const replacements = {
        '{user_name}': userInfo.name || '[Your Name]',
        '{contact_info}': `${userInfo.email || ''}${userInfo.phone ? ' | ' + userInfo.phone : ''}` || '[Your Contact]',
        '{date}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        '{gym_name}': customData.gym_name || '[Gym Name]',
        '{member_id}': customData.member_id || '[Member ID]',
        '{sign_date}': customData.sign_date || '[Sign Date]',
        '{reason_section}': customData.reason_section || customData.reason || '[Reason for cancellation]',
        '{cancellation_date}': customData.cancellation_date || new Date().toLocaleDateString(),
        '{insurance_company}': customData.insurance_company || '[Insurance Company]',
        '{claim_number}': customData.claim_number || '[Claim Number]',
        '{claim_date}': customData.claim_date || '[Claim Date]',
        '{policy_number}': customData.policy_number || '[Policy Number]',
        '{situation_description}': customData.situation_description || customData.situation || '[Situation description]',
        '{landlord_name}': customData.landlord_name || '[Landlord Name]',
        '{property_address}': customData.property_address || '[Property Address]',
        '{remedy_period}': customData.remedy_period || '7',
        '{employer_name}': customData.employer_name || '[Employer Name]',
        '{company_name}': customData.company_name || '[Company Name]',
        '{position}': customData.position || '[Position]',
        '{concerns_section}': customData.concerns_section || customData.concerns || '[Concerns to discuss]',
        '{service_provider}': customData.service_provider || '[Service Provider]',
        '{account_number}': customData.account_number || '[Account Number]',
        '{recipient_name}': customData.recipient_name || '[Recipient Name]',
        '{recipient_company}': customData.recipient_company || '[Company Name]',
        '{dispute_details}': customData.dispute_details || '[Dispute details]',
        '{red_flags_section}': '[Specific concerns from your contract]',
        '{contract_reference}': 'the contract states that',
        '{legal_reference}': getLegalReference(letterType, customData.state),
        '{legal_rights}': getLegalRights(letterType, customData.state),
        '{coverage_argument}': getCoverageArgument(customData),
        '{cancellation_terms}': customData.cancellation_terms || 'cancellation is permitted',
        '{state}': customData.state || 'your state'
    };

    // Replace all placeholders
    for (const [key, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value || `[${key}]`);
        subject = subject.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value || `[${key}]`);
    }

    return {
        subject,
        content
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
