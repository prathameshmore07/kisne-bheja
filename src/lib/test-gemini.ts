import { generateClarificationMessage, interpretCustomerReply } from "./gemini";

async function main() {
  const candidates = [
    { order_id: "order_blue", product_name: "Blue Kurta" },
    { order_id: "order_red", product_name: "Red Kurta" },
  ];

  const clarification = await generateClarificationMessage(candidates);
  console.log("Clarification message:", clarification);

  const reply = await interpretCustomerReply("haan blue kurta wala", candidates);
  console.log("Reply interpretation:", reply);
}
main();