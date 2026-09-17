const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '254700000000';

export function WhatsAppFab({ orderReference }: { orderReference?: string }) {
  const message = orderReference
    ? `Hi Serani Spark, I'd like help with my order ${orderReference}.`
    : `Hi Serani Spark, I'd like to ask about your products.`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="ss-whatsapp-fab">
      💬 WhatsApp us
    </a>
  );
}
