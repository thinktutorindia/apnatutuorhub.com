import { autoSyncWhatsAppInterestedLeadsAction, getInterestedLeadsAction } from "../app/actions/interested-leads.actions";

async function main() {
  console.log("=== 2. Testing WhatsApp Inbound Interest Sync & Fetch ===");
  const syncRes = await autoSyncWhatsAppInterestedLeadsAction();
  console.log("Sync Result:", syncRes);

  const leadsRes = await getInterestedLeadsAction({ limit: 10, filterMode: "ALL" });
  console.log("Leads Count:", leadsRes.data?.total);
  console.log("5km Nearby Count:", leadsRes.data?.within5KmCount);
  console.log("Online Count:", leadsRes.data?.onlineCount);
  if (leadsRes.data?.leads && leadsRes.data.leads.length > 0) {
    console.log("Sample Lead:", {
      name: leadsRes.data.leads[0].name,
      phone: leadsRes.data.leads[0].phone,
      mode: leadsRes.data.leads[0].deliveryMode,
      distanceKm: leadsRes.data.leads[0].distanceKm,
      fee: leadsRes.data.leads[0].recommendedFee,
      rateType: leadsRes.data.leads[0].recommendedRateType,
      subject: leadsRes.data.leads[0].recommendedSubject,
    });
  }
}

main().catch(console.error);
