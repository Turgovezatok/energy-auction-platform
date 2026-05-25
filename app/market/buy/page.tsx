async function submitOffer(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  if (!selectedAuction) return;

  const formData = new FormData(e.currentTarget);

  const year = new Date().getFullYear();
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  const offerNumber = `OFFER-${year}-${randomNumber}`;

  const { error } = await supabase.from("offers").insert({
    offer_number: offerNumber,
    offer_status: "submitted",
    submitted_at: new Date().toISOString(),

    auction_id: selectedAuction.id,
    pricing_model: formData.get("pricing_model"),
    fixed_price_eur_mwh: Number(formData.get("fixed_price_eur_mwh")) || null,
    day_ahead_adder_eur_mwh:
      Number(formData.get("day_ahead_adder_eur_mwh")) || null,
    hybrid_fixed_adder_eur_mwh:
      Number(formData.get("hybrid_fixed_adder_eur_mwh")) || null,
    hybrid_percent: Number(formData.get("hybrid_percent")) || null,
    payment_days: Number(formData.get("payment_days")) || null,
    offer_validity_days: Number(formData.get("offer_validity_days")) || null,
    notes: formData.get("notes"),
  });

  if (error) {
    setOfferMessage(error.message);
    return;
  }

  setOfferMessage(`Офертата е изпратена успешно ✅ Номер: ${offerNumber}`);
}
