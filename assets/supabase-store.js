(() => {
  const config = window.ATHLETIX_SUPABASE || {};
  const url = (config.url || "").replace(/\/$/, "");
  const key = config.publishableKey || "";

  function isConfigured() {
    return Boolean(url && key && url.includes("supabase.co"));
  }

  async function request(path, options = {}) {
    if (!isConfigured()) {
      throw new Error("Supabase n'est pas encore configure.");
    }

    const accessToken = window.AthletixAuth?.getAccessToken?.();
    const response = await fetch(`${url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: key,
        Authorization: `Bearer ${accessToken || key}`,
        "Content-Type": "application/json",
        Prefer: options.prefer || "return=representation",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(details || `Erreur Supabase ${response.status}`);
    }

    if (response.status === 204 || options.prefer === "return=minimal") return null;
    return response.json();
  }

  function collectionFromCategory(category) {
    if (category === "sweats") return "Ange Dechu";
    return "CompressX";
  }

  function pageFromCategory(category) {
    if (category === "sweats") return "sweats.html";
    return "tshirts.html";
  }

  function typeFromCategory(category) {
    if (category === "sweats") return "Sweat oversize";
    return "T-shirt compression";
  }

  function normalizeProduct(product) {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      collection: collectionFromCategory(product.category),
      category: product.category,
      type: typeFromCategory(product.category),
      status: product.active ? "Actif" : "Brouillon",
      stock: Number(product.stock || 0),
      price: Number(product.price || 0),
      compare: product.category === "sweats" ? 69.99 : 39.99,
      img: product.image_url || "assets/tee-black-front.png",
      page: pageFromCategory(product.category)
    };
  }

  function statusToUi(status) {
    const map = {
      a_expedier: "A expedier",
      expediee: "Expediee",
      payee: "Payee",
      livree: "Livree",
      annulee: "Annulee"
    };
    return map[status] || status || "A expedier";
  }

  function statusToDb(status) {
    const map = {
      "A expedier": "a_expedier",
      Expediee: "expediee",
      Payee: "payee",
      Livree: "livree",
      Annulee: "annulee"
    };
    return map[status] || status || "a_expedier";
  }

  function normalizeOrder(order) {
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const item = items[0] || null;
    const productName = items.length > 1
      ? items.map((orderItem) => {
        const size = orderItem.size ? ` taille ${orderItem.size}` : "";
        return `${orderItem.product_name}${size}`;
      }).join(" + ")
      : `${item?.product_name || "Commande Athletix"}${item?.size ? ` taille ${item.size}` : ""}`;
    const quantity = items.reduce((sum, orderItem) => sum + Number(orderItem.quantity || 0), 0) || item?.quantity || 1;
    return {
      id: order.order_number,
      supabaseId: order.id,
      date: new Date(order.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      client: order.customers?.full_name || "Client",
      channel: "Boutique en ligne",
      product: productName,
      items: quantity,
      total: Number(order.total || 0),
      payment: order.payment_method || order.payment_status || "Payee",
      status: statusToUi(order.status),
      shipping: "Adresse client"
    };
  }

  async function getProducts() {
    const products = await request("products?select=*&order=created_at.asc");
    return products.map(normalizeProduct);
  }

  async function updateProductStock(productId, stock) {
    const [product] = await request(`products?id=eq.${encodeURIComponent(productId)}`, {
      method: "PATCH",
      body: JSON.stringify({ stock })
    });
    return normalizeProduct(product);
  }

  async function getOrders() {
    const orders = await request("orders?select=*,customers(full_name,email),order_items(product_name,quantity,price)&order=created_at.desc");
    return orders.map(normalizeOrder);
  }

  async function createOrder(payload) {
    const customerId = crypto.randomUUID();
    const orderId = crypto.randomUUID();
    const customerName = payload.customer?.fullName || "Client boutique";
    const customerEmail = payload.customer?.email || `client-${Date.now()}@athletix.local`;
    await request("customers", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        id: customerId,
        full_name: customerName,
        email: customerEmail
      })
    });

    const orderNumber = `ATH-${Date.now()}`;
    const total = payload.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
    await request("orders", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        id: orderId,
        order_number: orderNumber,
        customer_id: customerId,
        total,
        payment_status: "Payee",
        payment_method: payload.paymentMethod || "Demo",
        status: "a_expedier"
      })
    });

    const orderItems = payload.items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      product_name: item.size ? `${item.name} taille ${item.size}` : item.name,
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0)
    }));

    await request("order_items", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify(orderItems)
    });

    return normalizeOrder({
      id: orderId,
      order_number: orderNumber,
      created_at: new Date().toISOString(),
      total,
      payment_status: "Payee",
      payment_method: payload.paymentMethod || "Demo",
      status: "a_expedier",
      customers: { id: customerId, full_name: customerName, email: customerEmail },
      order_items: orderItems
    });
  }

  async function updateOrderStatus(orderId, status) {
    const [order] = await request(`orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: statusToDb(status) })
    });
    return order;
  }

  async function addNewsletterSubscriber(email, source = "homepage") {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error("Adresse email invalide.");
    }

    try {
      await request("newsletter_subscribers", {
        method: "POST",
        prefer: "return=minimal",
        body: JSON.stringify({
          email: cleanEmail,
          source,
          status: "active"
        })
      });
      return { email: cleanEmail, alreadySubscribed: false };
    } catch (error) {
      if (String(error.message || "").includes("duplicate key")) {
        return { email: cleanEmail, alreadySubscribed: true };
      }
      throw error;
    }
  }

  async function getNewsletterSubscribers() {
    return request("newsletter_subscribers?select=*&order=created_at.desc");
  }

  window.AthletixStore = {
    isConfigured,
    getProducts,
    updateProductStock,
    getOrders,
    createOrder,
    updateOrderStatus,
    addNewsletterSubscriber,
    getNewsletterSubscribers
  };
})();
