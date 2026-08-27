const { randomUUID } = require("crypto");

const TICKET_REF_PREFIX = "TICKET-";
const TICKET_REF_PAD = 5;

function parseTicketRefNumber(ref) {
  if (!ref) return 0;
  const n = parseInt(String(ref).replace(/^TICKET-/i, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function formatTicketRef(n) {
  return `${TICKET_REF_PREFIX}${String(n).padStart(TICKET_REF_PAD, "0")}`;
}

/** Display label, e.g. Ticket-00001 */
function formatTicketRefLabel(ref) {
  if (!ref) return null;
  const n = parseTicketRefNumber(ref);
  if (!n) return String(ref);
  return `Ticket-${String(n).padStart(TICKET_REF_PAD, "0")}`;
}

async function nextTicketRef(sequelize) {
  try {
    const [rows] = await sequelize.query(
      "SELECT ticket_ref FROM support_tickets WHERE ticket_ref REGEXP '^TICKET-[0-9]+$'"
    );
    const max = rows.reduce((m, r) => {
      const n = parseTicketRefNumber(r.ticket_ref);
      return n > m ? n : m;
    }, 0);
    return formatTicketRef(max + 1);
  } catch {
    return formatTicketRef(parseInt(randomUUID().replace(/\D/g, "").slice(0, 5), 10) || 1);
  }
}

module.exports = {
  TICKET_REF_PREFIX,
  formatTicketRef,
  formatTicketRefLabel,
  nextTicketRef,
  parseTicketRefNumber,
};
