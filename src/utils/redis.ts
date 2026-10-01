// function with endcode and decode for values only

export type StockMember = string;

export function getStockKey(saleId: string) {
  return `${saleId}:stock`;
}

export function decodeStockMember(member: string) {
  return Number(member);
}

// Sorted Sets

export type ZSetMember = `${string}:${string}`;

export function getSortedSetkey(saleId: string) {
  return `${saleId}:zset`;
}

export function encodeZSetMember(orderId: string, userId: string): ZSetMember {
  return `${orderId}:${userId}`;
}

export function decodeZSetMember(member: string): {
  orderId: string;
  userId: string;
} {
  const idx = member.indexOf(":");
  if (idx === -1) throw new Error(`Invalid zset member: ${member}`);
  return {
    orderId: member.slice(0, idx),
    userId: member.slice(idx + 1),
  };
}
