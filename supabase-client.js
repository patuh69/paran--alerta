(function () {
  const config = window.PARANA_ALERTA_SUPABASE;

  if (!config || !window.supabase) {
    console.warn("Supabase ainda não está disponível.");
    return;
  }

  window.paranaSupabase = window.supabase.createClient(
    config.url,
    config.publishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  const client = window.paranaSupabase;

  function createUuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
      const random = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
      const value = character === "x" ? random : (random & 3) | 8;
      return value.toString(16);
    });
  }

  window.paranaData = {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signUp(email, password, displayName) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } }
      });
      if (error) throw error;
      if (data.session) await client.auth.signOut();
      return data;
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    async getMyProfile() {
      const { data: authData } = await client.auth.getUser();
      if (!authData.user) return null;
      const { data, error } = await client.from("profiles").select("*").eq("id", authData.user.id).single();
      if (error) throw error;
      return data;
    },

    async listJournalists() {
      const { data, error } = await client.from("profiles").select("id, display_name, role, status, created_at").neq("status", "archived").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async updateJournalist(id, changes) {
      const payload = {};
      if (["pending", "active", "suspended", "rejected", "archived"].includes(changes.status)) payload.status = changes.status;
      if (["journalist", "editor"].includes(changes.role)) payload.role = changes.role;
      const { data, error } = await client.from("profiles").update(payload).eq("id", id).select("id, display_name, role, status, created_at").single();
      if (error) throw error;
      return data;
    },

    async sendContactMessage(message) {
      const { error } = await client.from("contact_messages").insert({
        sender_name: message.name,
        sender_email: message.email,
        subject: message.subject,
        message: message.message
      });
      if (error) throw error;
      return true;
    },

    async listContactMessages() {
      const { data, error } = await client.from("contact_messages").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async updateContactMessage(id, status) {
      if (!["new", "read", "resolved"].includes(status)) throw new Error("Estado de mensagem inválido.");
      const { data, error } = await client.from("contact_messages").update({ status }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },

    async deleteContactMessage(id) {
      const { error } = await client.from("contact_messages").delete().eq("id", id);
      if (error) throw error;
    },

    async listAds(admin = false) {
      let query = client.from("ads").select("*").order("created_at", { ascending: false });
      if (!admin) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async saveAd(ad, id, userId) {
      const payload = {
        advertiser: ad.advertiser,
        title: ad.title,
        description: ad.description,
        button_text: ad.buttonText,
        target_url: ad.targetUrl,
        image_url: ad.image || null,
        placement: "home_banner",
        is_active: ad.isActive,
        starts_at: ad.startsAt || null,
        ends_at: ad.endsAt || null,
        created_by: userId
      };
      if (id) {
        delete payload.created_by;
        const { data, error } = await client.from("ads").update(payload).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await client.from("ads").insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async deleteAd(id) {
      const { error } = await client.from("ads").delete().eq("id", id);
      if (error) throw error;
    },

    async listArticles(includePrivate = false) {
      let query = client.from("articles").select("*, profiles!articles_author_id_fkey(display_name, avatar_url, bio)").order("published_at", { ascending: false });
      if (!includePrivate) query = query.eq("status", "published");
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async uploadImage(dataUrl, userId) {
      if (!dataUrl) return "";
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const fileName = `${userId}/${createUuid()}.jpg`;
      const { error } = await client.storage.from("article-images").upload(fileName, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      return client.storage.from("article-images").getPublicUrl(fileName).data.publicUrl;
    },

    async saveArticle(article, articleId, userId) {
      const payload = {
        author_id: userId,
        title: article.title,
        slug: `${article.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`,
        summary: article.summary,
        content: article.content,
        category: article.category,
        image_url: article.image || null,
        status: "published",
        published_at: new Date().toISOString()
      };

      if (articleId) {
        delete payload.slug;
        delete payload.published_at;
        const { data, error } = await client.from("articles").update(payload).eq("id", articleId).select().single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await client.from("articles").insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async deleteArticle(id) {
      const { error } = await client.from("articles").delete().eq("id", id);
      if (error) throw error;
    },

    async addComment(articleId, name, content) {
      const { data, error } = await client.from("comments").insert({ article_id: articleId, author_name: name, content }).select().single();
      if (error) throw error;
      return data;
    },

    async listComments(articleId) {
      const { data, error } = await client.from("comments").select("*").eq("article_id", articleId).eq("status", "approved").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },

    async countLikes(articleId) {
      const { count, error } = await client.from("article_likes").select("id", { count: "exact", head: true }).eq("article_id", articleId);
      if (error) throw error;
      return count || 0;
    },

    async addLike(articleId, visitorId) {
      const { error } = await client.from("article_likes").insert({ article_id: articleId, visitor_id: visitorId });
      if (error && error.code !== "23505") throw error;
      return this.countLikes(articleId);
    },

    async incrementViews(articleId) {
      const { error } = await client.rpc("increment_article_views", { article_uuid: articleId });
      if (error) throw error;
    }
  };
})();
