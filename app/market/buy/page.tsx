async function submitOffer(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  if (!selectedAuction) return;

  const formData = new FormData(e.currentTarget);

  const pricingModel = String(formData.get("pricing_model") || "");

  const fixedPrice =
    Number(formData.get("fixed_price_eur_mwh")) || null;

  const dayAheadAdder =
    Number(formData.get("day_ahead_adder_eur_mwh")) || null;

  const hybridFixedAdder =
    Number(formData.get("hybrid_fixed_adder_eur_mwh")) || null;

  const hybridPercent =
    Number(formData.get("hybrid_percent")) || null;

  if (pricingModel === "fixed" && !fixedPrice) {
    setOfferMessage("Моля въведи фиксирана цена.");
    return;
  }

  if (
    (pricingModel === "day_ahead_adder" ||
      pricingModel === "day_ahead_no_balancing") &&
    !dayAheadAdder
  ) {
    setOfferMessage("Моля въведи добавка €/MWh.");
    return;
  }

  if (
    pricingModel === "hybrid" &&
    (!hybridFixedAdder || !hybridPercent)
  ) {
    setOfferMessage(
      "Моля въведи фиксирана част и процентна добавка."
    );
    return;
  }

  const year = new Date().getFullYear();

  const randomNumber = Math.floor(
    100000 + Math.random() * 900000
  );

  const offerNumber = `OFFER-${year}-${randomNumber}`;

  const { error } = await supabase.from("offers").insert({
    offer_number: offerNumber,
    offer_status: "submitted",
    submitted_at: new Date().toISOString(),

    auction_id: selectedAuction.id,

    pricing_model: pricingModel,

    fixed_price_eur_mwh: fixedPrice,

    day_ahead_adder_eur_mwh: dayAheadAdder,

    hybrid_fixed_adder_eur_mwh: hybridFixedAdder,

    hybrid_percent: hybridPercent,

    payment_days:
      Number(formData.get("payment_days")) || null,

    offer_validity_days:
      Number(formData.get("offer_validity_days")) || null,

    notes: formData.get("notes"),
  });

  if (error) {
    setOfferMessage(error.message);
    return;
  }

  setOfferMessage(
    `Офертата е изпратена успешно ✅ Номер: ${offerNumber}`
  );

  setTimeout(() => {
    setSelectedAuction(null);
    setOfferMessage("");
  }, 1800);
}
