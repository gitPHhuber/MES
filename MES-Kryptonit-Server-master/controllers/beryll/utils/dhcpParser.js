/**
 * Парсит содержимое файла dhcpd.leases
 */
function parseDhcpLeases(content) {
  const leases = [];
  const leaseRegex = /lease\s+([\d.]+)\s*\{([^}]+)\}/g;
  
  let match;
  while ((match = leaseRegex.exec(content)) !== null) {
    const ip = match[1];
    const body = match[2];
    
    const lease = {
      ipAddress: ip,
      macAddress: null,
      hostname: null,
      serialNumber: null,
      leaseStart: null,
      leaseEnd: null,
      leaseActive: false
    };
    
    const macMatch = body.match(/hardware\s+ethernet\s+([\da-f:]+)/i);
    if (macMatch) {
      lease.macAddress = macMatch[1].toUpperCase();
    }
    
    const hostnameMatch = body.match(/client-hostname\s+"([^"]+)"/);
    if (hostnameMatch) {
      lease.hostname = hostnameMatch[1];
      const parts = lease.hostname.split("-");
      if (parts.length >= 2) {
        lease.serialNumber = parts[parts.length - 1];
      }
    }
    
    const startsMatch = body.match(/starts\s+\d+\s+([\d/:\s]+)/);
    if (startsMatch) {
      lease.leaseStart = parseLeaseDate(startsMatch[1]);
    }
    
    const endsMatch = body.match(/ends\s+\d+\s+([\d/:\s]+)/);
    if (endsMatch) {
      lease.leaseEnd = parseLeaseDate(endsMatch[1]);
    }
    
    const stateMatch = body.match(/binding\s+state\s+(\w+)/);
    if (stateMatch) {
      lease.leaseActive = stateMatch[1].toLowerCase() === "active";
    }
    
    leases.push(lease);
  }
  
  return leases;
}

function parseLeaseDate(dateStr) {
  try {
    const cleaned = dateStr.trim().replace(/;$/, "");
    const [datePart, timePart] = cleaned.split(" ");
    const [year, month, day] = datePart.split("/");
    return new Date(`${year}-${month}-${day}T${timePart}Z`);
  } catch (e) {
    return null;
  }
}

module.exports = {
  parseDhcpLeases,
  parseLeaseDate
};
