export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      order_items: {
        Row: {
          merchant_archived_at: string | null;
          id: string;
          merchant_order_id: string | null;
          offer_id: string | null;
          options: Json;
          order_id: string;
          product_name: string;
          quantity: number;
          store_id: string;
          unit_price: number;
        };
        Insert: {
          merchant_archived_at?: string | null;
          id?: string;
          merchant_order_id?: string | null;
          offer_id?: string | null;
          options?: Json;
          order_id: string;
          product_name: string;
          quantity: number;
          store_id: string;
          unit_price: number;
        };
        Update: {
          merchant_archived_at?: string | null;
          id?: string;
          merchant_order_id?: string | null;
          offer_id?: string | null;
          options?: Json;
          order_id?: string;
          product_name?: string;
          quantity?: number;
          store_id?: string;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "store_offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_merchant_order_id_fkey";
            columns: ["merchant_order_id"];
            isOneToOne: false;
            referencedRelation: "merchant_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      merchant_orders: {
        Row: {
          id: string;
          order_id: string;
          store_id: string;
          customer_id: string;
          status: string;
          subtotal: number;
          shipping_fee: number;
          quoted_at: string | null;
          responded_at: string | null;
          payment_status: string;
          paid_amount: number | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          store_id: string;
          customer_id: string;
          status?: string;
          subtotal?: number;
          shipping_fee?: number;
          quoted_at?: string | null;
          responded_at?: string | null;
          payment_status?: string;
          paid_amount?: number | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          store_id?: string;
          customer_id?: string;
          status?: string;
          subtotal?: number;
          shipping_fee?: number;
          quoted_at?: string | null;
          responded_at?: string | null;
          payment_status?: string;
          paid_amount?: number | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "merchant_orders_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "merchant_orders_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      merchant_order_cod_collections: {
        Row: {
          id: string;
          merchant_order_id: string;
          order_id: string;
          amount: number;
          collection_channel: string;
          collected_by: string;
          collected_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_order_id: string;
          order_id: string;
          amount: number;
          collection_channel: string;
          collected_by: string;
          collected_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_order_id?: string;
          order_id?: string;
          amount?: number;
          collection_channel?: string;
          collected_by?: string;
          collected_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "merchant_order_cod_collections_merchant_order_id_fkey";
            columns: ["merchant_order_id"];
            isOneToOne: true;
            referencedRelation: "merchant_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "merchant_order_cod_collections_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          address_line: string | null;
          commission_amount: number;
          commune: string;
          created_at: string;
          delivery_method: string | null;
          delivery_type: string;
          full_name: string;
          id: string;
          payment_method: string;
          phone: string;
          receipt_url: string | null;
          shipment_id: string | null;
          shipping_fee: number;
          status: string;
          subtotal: number;
          total: number;
          user_id: string;
          wilaya_id: number;
        };
        Insert: {
          address_line?: string | null;
          commission_amount?: number;
          commune: string;
          created_at?: string;
          delivery_method?: string;
          delivery_type: string;
          full_name: string;
          id?: string;
          payment_method: string;
          phone: string;
          receipt_url?: string | null;
          shipment_id?: string;
          shipping_fee: number;
          status?: string;
          subtotal: number;
          total: number;
          user_id: string;
          wilaya_id: number;
        };
        Update: {
          address_line?: string | null;
          commission_amount?: number;
          commune?: string;
          created_at?: string;
          delivery_method?: string;
          delivery_type?: string;
          full_name?: string;
          id?: string;
          payment_method?: string;
          phone?: string;
          receipt_url?: string | null;
          shipment_id?: string;
          shipping_fee?: number;
          status?: string;
          subtotal?: number;
          total?: number;
          user_id?: string;
          wilaya_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "orders_wilaya_id_fkey";
            columns: ["wilaya_id"];
            isOneToOne: false;
            referencedRelation: "wilayas";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          created_at: string;
          id: string;
          image_url: string;
          is_primary: boolean;
          offer_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url: string;
          is_primary?: boolean;
          offer_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string;
          is_primary?: boolean;
          offer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "store_offers";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          brand: string | null;
          category: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          rating: number;
          view_count: number;
        };
        Insert: {
          brand?: string | null;
          category: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          rating?: number;
          view_count?: number;
        };
        Update: {
          brand?: string | null;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          rating?: number;
          view_count?: number;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: Json;
          id: string;
          read: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          read?: boolean;
          title: string;
          type?: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          read?: boolean;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"];
          avatar_url: string | null;
          commune: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          is_phone_verified: boolean;
          is_public: boolean;
          phone: string | null;
          updated_at: string;
          user_id: string;
          wilaya_id: number | null;
        };
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"];
          avatar_url?: string | null;
          commune?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          is_phone_verified?: boolean;
          is_public?: boolean;
          phone?: string | null;
          updated_at?: string;
          user_id: string;
          wilaya_id?: number | null;
        };
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"];
          avatar_url?: string | null;
          commune?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          is_phone_verified?: boolean;
          is_public?: boolean;
          phone?: string | null;
          updated_at?: string;
          user_id?: string;
          wilaya_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_wilaya_id_fkey";
            columns: ["wilaya_id"];
            isOneToOne: false;
            referencedRelation: "wilayas";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          merchant_archived_at: string | null;
          code: string;
          created_at: string;
          expires_at: string;
          id: string;
          offer_id: string | null;
          options: Json;
          quantity: number;
          status: string;
          store_id: string;
          user_id: string;
        };
        Insert: {
          merchant_archived_at?: string | null;
          code: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          offer_id?: string | null;
          options?: Json;
          quantity?: number;
          status?: string;
          store_id: string;
          user_id: string;
        };
        Update: {
          merchant_archived_at?: string | null;
          code?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          offer_id?: string | null;
          options?: Json;
          quantity?: number;
          status?: string;
          store_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "store_offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          status: string;
          target_id: string;
          target_type: string;
          user_id: string;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating: number;
          status?: string;
          target_id: string;
          target_type: string;
          user_id?: string;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating?: number;
          status?: string;
          target_id?: string;
          target_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      store_offers: {
        Row: {
          created_at: string;
          id: string;
          is_available: boolean;
          is_merchant_hidden: boolean;
          last_confirmed_at: string;
          old_price: number | null;
          options: Json;
          price: number;
          product_id: string;
          stock_quantity: number;
          store_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_available?: boolean;
          is_merchant_hidden?: boolean;
          last_confirmed_at?: string;
          old_price?: number | null;
          options?: Json;
          price: number;
          product_id: string;
          stock_quantity?: number;
          store_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_available?: boolean;
          is_merchant_hidden?: boolean;
          last_confirmed_at?: string;
          old_price?: number | null;
          options?: Json;
          price?: number;
          product_id?: string;
          stock_quantity?: number;
          store_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_offers_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_offers_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      stores: {
        Row: {
          address_line: string | null;
          category: string | null;
          commission_rate: number;
          commune: string | null;
          cover_url: string | null;
          created_at: string;
          description: string | null;
          facebook_url: string | null;
          id: string;
          instagram_url: string | null;
          is_verified: boolean;
          latitude: number | null;
          logo_url: string | null;
          longitude: number | null;
          name: string;
          opening_hours: Json;
          open?: boolean;
          distance?: number | null;
          owner_id: string | null;
          phone: string | null;
          rating: number;
          slug: string;
          subcategories: string[];
          whatsapp: string | null;
          wilaya_id: number;
        };
        Insert: {
          address_line?: string | null;
          category?: string | null;
          commission_rate?: number;
          commune?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          facebook_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          is_verified?: boolean;
          latitude?: number | null;
          logo_url?: string | null;
          longitude?: number | null;
          name: string;
          opening_hours?: Json;
          open?: boolean;
          distance?: number | null;
          owner_id?: string | null;
          phone?: string | null;
          rating?: number;
          slug?: string;
          subcategories?: string[];
          whatsapp?: string | null;
          wilaya_id: number;
        };
        Update: {
          address_line?: string | null;
          category?: string | null;
          commission_rate?: number;
          commune?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          facebook_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          is_verified?: boolean;
          latitude?: number | null;
          logo_url?: string | null;
          longitude?: number | null;
          name?: string;
          opening_hours?: Json;
          open?: boolean;
          distance?: number | null;
          owner_id?: string | null;
          phone?: string | null;
          rating?: number;
          slug?: string;
          subcategories?: string[];
          whatsapp?: string | null;
          wilaya_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "stores_wilaya_id_fkey";
            columns: ["wilaya_id"];
            isOneToOne: false;
            referencedRelation: "wilayas";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      wilayas: {
        Row: {
          desk_price: number;
          home_price: number;
          id: number;
          name_ar: string;
          name_fr: string;
        };
        Insert: {
          desk_price: number;
          home_price: number;
          id: number;
          name_ar: string;
          name_fr: string;
        };
        Update: {
          desk_price?: number;
          home_price?: number;
          id?: number;
          name_ar?: string;
          name_fr?: string;
        };
        Relationships: [];
      };
      delivery_companies: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          contact_name: string | null;
          contact_phone: string;
          email: string | null;
          license_number: string | null;
          is_approved: boolean;
          commission_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          contact_name?: string;
          contact_phone: string;
          email?: string;
          license_number?: string;
          is_approved?: boolean;
          commission_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          contact_name?: string;
          contact_phone?: string;
          email?: string;
          license_number?: string;
          is_approved?: boolean;
          commission_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_companies_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_coverage_areas: {
        Row: {
          id: string;
          company_id: string;
          wilaya_id: number;
          communes: string[];
          base_fee: number;
          fee_per_km: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          wilaya_id: number;
          communes?: string[];
          base_fee?: number;
          fee_per_km?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          wilaya_id?: number;
          communes?: string[];
          base_fee?: number;
          fee_per_km?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_coverage_areas_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "delivery_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_coverage_areas_wilaya_id_fkey";
            columns: ["wilaya_id"];
            isOneToOne: false;
            referencedRelation: "wilayas";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_services: {
        Row: {
          id: string;
          company_id: string;
          service_name: string;
          estimated_hours: number | null;
          base_price: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          service_name: string;
          estimated_hours?: number;
          base_price?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          service_name?: string;
          estimated_hours?: number;
          base_price?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_services_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "delivery_companies";
            referencedColumns: ["id"];
          },
        ];
      };
      shipments: {
        Row: {
          id: string;
          order_id: string;
          merchant_order_id: string | null;
          company_id: string | null;
          status: string;
          pickup_address: string | null;
          delivery_address: string | null;
          recipient_name: string | null;
          recipient_phone: string | null;
          fee: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          merchant_order_id?: string | null;
          company_id?: string;
          status?: string;
          pickup_address?: string;
          delivery_address?: string;
          recipient_name?: string;
          recipient_phone?: string;
          fee?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          merchant_order_id?: string | null;
          company_id?: string;
          status?: string;
          pickup_address?: string;
          delivery_address?: string;
          recipient_name?: string;
          recipient_phone?: string;
          fee?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_merchant_order_id_fkey";
            columns: ["merchant_order_id"];
            isOneToOne: false;
            referencedRelation: "merchant_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "delivery_companies";
            referencedColumns: ["id"];
          },
        ];
      };
      shipment_status_logs: {
        Row: {
          id: string;
          shipment_id: string;
          status: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shipment_id: string;
          status: string;
          note?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          shipment_id?: string;
          status?: string;
          note?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shipment_status_logs_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      shipment_tracking: {
        Row: {
          id: string;
          shipment_id: string;
          lat: number | null;
          lng: number | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          shipment_id: string;
          lat?: number;
          lng?: number;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          shipment_id?: string;
          lat?: number;
          lng?: number;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shipment_tracking_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      account_deletion_requests: {
        Row: {
          id: string;
          user_id: string | null;
          status: string;
          requested_at: string;
          updated_at: string;
          resolved_at: string | null;
          retention_note: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          status?: string;
          requested_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          retention_note?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          status?: string;
          requested_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          retention_note?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      approved_delivery_companies: {
        Row: {
          id: string;
          company_name: string;
          contact_phone: string;
        };
        Relationships: [];
      };
      public_personal_profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          wilaya_id: number | null;
          commune: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      register_my_push_device: {
        Args: { _platform: string; _token: string };
        Returns: undefined;
      };
      unregister_my_push_device: {
        Args: { _token: string };
        Returns: undefined;
      };
      request_account_deletion: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      cancel_account_deletion_request: {
        Args: { _request_id: string };
        Returns: boolean;
      };
      collect_merchant_order_cod: {
        Args: { _merchant_order_id: string };
        Returns: Database["public"]["Tables"]["merchant_order_cod_collections"]["Row"];
      };
      merchant_reject_order: {
        Args: { _merchant_order_id: string; _reason?: string | null };
        Returns: Database["public"]["Tables"]["merchant_orders"]["Row"];
      };
      cancel_reservation: {
        Args: { _reservation_id: string };
        Returns: undefined;
      };
      create_order: {
        Args: {
          _address_line: string;
          _commune: string;
          _delivery_type: string;
          _full_name: string;
          _items: Json;
          _payment_method: string;
          _phone: string;
          _receipt_url?: string;
          _wilaya_id: number;
        };
        Returns: string;
      };
      create_order_with_delivery: {
        Args: {
          _address_line: string;
          _commune: string;
          _delivery_company_id?: string | null;
          _delivery_type: string;
          _full_name: string;
          _items: Json;
          _payment_method: string;
          _phone: string;
          _idempotency_key: string;
          _receipt_url?: string | null;
          _wilaya_id: number;
        };
        Returns: string;
      };
      create_reservation: {
        Args: {
          _hours?: number;
          _offer_id: string;
          _options?: Json;
          _quantity?: number;
        };
        Returns: {
          code: string;
          created_at: string;
          expires_at: string;
          id: string;
          offer_id: string;
          options: Json;
          quantity: number;
          status: string;
          store_id: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "reservations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_my_store: {
        Args: {
          _store_name: string;
          _slug: string;
          _phone: string;
          _whatsapp: string;
          _wilaya_id: number;
          _commune: string;
          _address_line: string;
          _latitude: number | null;
          _longitude: number | null;
          _opening_hours: Json;
          _category?: string | null;
          _subcategories?: string[];
        };
        Returns: string;
      };
      get_my_account_type: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["account_type"];
      };
      set_my_profile_visibility: {
        Args: { _is_public: boolean };
        Returns: undefined;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      submit_review: {
        Args: {
          _comment?: string;
          _rating: number;
          _target_id: string;
          _target_type: "product" | "store";
        };
        Returns: {
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          status: string;
          target_id: string;
          target_type: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "reviews";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_content_report: {
        Args: {
          _details?: string;
          _reason: string;
          _target_id: string;
          _target_type: string;
        };
        Returns: string;
      };
      link_order_shipment: {
        Args: {
          _delivery_method?: string;
          _order_id: string;
          _shipment_id: string;
        };
        Returns: undefined;
      };
      merchant_update_merchant_order_status: {
        Args: {
          _merchant_order_id: string;
          _status: string;
        };
        Returns: {
          created_at: string;
          customer_id: string;
          id: string;
          order_id: string;
          status: string;
          store_id: string;
          subtotal: number;
          updated_at: string;
        };
      };
      merchant_archive_order_items: {
        Args: {
          _order_id: string;
          _store_id: string;
        };
        Returns: undefined;
      };
      update_shipment_status: {
        Args: {
          _note?: string | null;
          _shipment_id: string;
          _status: string;
        };
        Returns: {
          company_id: string | null;
          created_at: string;
          delivery_address: string | null;
          fee: number | null;
          id: string;
          notes: string | null;
          order_id: string;
          pickup_address: string | null;
          recipient_name: string | null;
          recipient_phone: string | null;
          status: string;
          updated_at: string;
        };
      };
      is_offer_owner: { Args: { _offer_id: string }; Returns: boolean };
      is_order_merchant: { Args: { _order_id: string }; Returns: boolean };
      is_order_owner: { Args: { _order_id: string }; Returns: boolean };
      is_store_owner: { Args: { _store_id: string }; Returns: boolean };
      merchant_confirm_all_stock: {
        Args: { _store_id: string };
        Returns: number;
      };
      merchant_confirm_reservation: {
        Args: { _code: string };
        Returns: {
          code: string;
          created_at: string;
          expires_at: string;
          id: string;
          offer_id: string;
          options: Json;
          quantity: number;
          status: string;
          store_id: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "reservations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      account_type: "personal" | "merchant" | "delivery_company";
      app_role: "customer" | "merchant" | "delivery_company";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_type: ["personal", "merchant", "delivery_company"],
      app_role: ["customer", "merchant", "delivery_company"],
    },
  },
} as const;
