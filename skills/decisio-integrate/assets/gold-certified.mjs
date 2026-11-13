// Use after the client has validated the answer's question type and probabilities.
export function isGoldCertified(answer) {
  return answer?.certified === true && answer.certificate_kind === 'gold' && typeof answer.certificate === 'string' && answer.certificate.length > 0;
}
