--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2026-05-12 04:19:24

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 935 (class 1247 OID 20688)
-- Name: conversation_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.conversation_type AS ENUM (
    'direct',
    'group'
);


ALTER TYPE public.conversation_type OWNER TO postgres;

--
-- TOC entry 929 (class 1247 OID 20670)
-- Name: device_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.device_status AS ENUM (
    'available',
    'in_use',
    'maintenance'
);


ALTER TYPE public.device_status OWNER TO postgres;

--
-- TOC entry 926 (class 1247 OID 20664)
-- Name: device_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.device_type AS ENUM (
    'wheelchair',
    'stretcher'
);


ALTER TYPE public.device_type OWNER TO postgres;

--
-- TOC entry 920 (class 1247 OID 20650)
-- Name: node_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.node_type AS ENUM (
    'hallway',
    'room_entrance'
);


ALTER TYPE public.node_type OWNER TO postgres;

--
-- TOC entry 941 (class 1247 OID 20702)
-- Name: notification_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_type AS ENUM (
    'system',
    'appointment',
    'alert'
);


ALTER TYPE public.notification_type OWNER TO postgres;

--
-- TOC entry 947 (class 1247 OID 20718)
-- Name: otp_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.otp_type AS ENUM (
    'register',
    'reset_password',
    'payment'
);


ALTER TYPE public.otp_type OWNER TO postgres;

--
-- TOC entry 938 (class 1247 OID 20694)
-- Name: path_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.path_status AS ENUM (
    'ongoing',
    'completed',
    'cancelled'
);


ALTER TYPE public.path_status OWNER TO postgres;

--
-- TOC entry 944 (class 1247 OID 20710)
-- Name: spending_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.spending_status AS ENUM (
    'pending',
    'paid',
    'failed'
);


ALTER TYPE public.spending_status OWNER TO postgres;

--
-- TOC entry 914 (class 1247 OID 20632)
-- Name: staff_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.staff_role AS ENUM (
    'doctor',
    'nurse',
    'admin',
    'coordinator'
);


ALTER TYPE public.staff_role OWNER TO postgres;

--
-- TOC entry 917 (class 1247 OID 20642)
-- Name: staff_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.staff_status AS ENUM (
    'available',
    'busy',
    'offline'
);


ALTER TYPE public.staff_status OWNER TO postgres;

--
-- TOC entry 932 (class 1247 OID 20678)
-- Name: treatment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.treatment_status AS ENUM (
    'pending',
    'examining',
    'completed',
    'cancelled'
);


ALTER TYPE public.treatment_status OWNER TO postgres;

--
-- TOC entry 911 (class 1247 OID 20624)
-- Name: user_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'inactive',
    'banned'
);


ALTER TYPE public.user_status OWNER TO postgres;

--
-- TOC entry 923 (class 1247 OID 20656)
-- Name: ward_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ward_status AS ENUM (
    'open',
    'closed',
    'maintenance'
);


ALTER TYPE public.ward_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 269 (class 1259 OID 21119)
-- Name: areas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.areas (
    area_id text NOT NULL,
    map_id integer DEFAULT 1
);


ALTER TABLE public.areas OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 21059)
-- Name: bottlenecks_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bottlenecks_data (
    id integer NOT NULL,
    route_id text,
    edge_name text,
    x double precision,
    y double precision,
    occupancy_rate double precision
);


ALTER TABLE public.bottlenecks_data OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 21058)
-- Name: bottlenecks_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bottlenecks_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bottlenecks_data_id_seq OWNER TO postgres;

--
-- TOC entry 5239 (class 0 OID 0)
-- Dependencies: 259
-- Name: bottlenecks_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bottlenecks_data_id_seq OWNED BY public.bottlenecks_data.id;


--
-- TOC entry 280 (class 1259 OID 21321)
-- Name: canteens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.canteens (
    canteen_id integer NOT NULL,
    name character varying(100) NOT NULL,
    location_node_id character varying(50),
    open_time character varying(20),
    close_time character varying(20),
    menu_url character varying(255),
    zone_id character varying(50)
);


ALTER TABLE public.canteens OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 21320)
-- Name: canteens_canteen_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.canteens_canteen_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.canteens_canteen_id_seq OWNER TO postgres;

--
-- TOC entry 5240 (class 0 OID 0)
-- Dependencies: 279
-- Name: canteens_canteen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.canteens_canteen_id_seq OWNED BY public.canteens.canteen_id;


--
-- TOC entry 222 (class 1259 OID 20744)
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    type public.conversation_type NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 20743)
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversations_id_seq OWNER TO postgres;

--
-- TOC entry 5241 (class 0 OID 0)
-- Dependencies: 221
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- TOC entry 233 (class 1259 OID 20831)
-- Name: devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devices (
    id integer NOT NULL,
    current_node_id character varying(50) NOT NULL,
    assigned_user_id integer,
    type public.device_type NOT NULL,
    status public.device_status DEFAULT 'available'::public.device_status NOT NULL
);


ALTER TABLE public.devices OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 20830)
-- Name: devices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.devices_id_seq OWNER TO postgres;

--
-- TOC entry 5242 (class 0 OID 0)
-- Dependencies: 232
-- Name: devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.devices_id_seq OWNED BY public.devices.id;


--
-- TOC entry 263 (class 1259 OID 21081)
-- Name: edge_density; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.edge_density (
    edge_id text NOT NULL,
    current_count integer,
    fill_percentage text
);


ALTER TABLE public.edge_density OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 21074)
-- Name: edge_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.edge_status (
    edge_id text NOT NULL,
    occupancy_rate double precision
);


ALTER TABLE public.edge_status OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 21067)
-- Name: edges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.edges (
    edge_id text NOT NULL
);


ALTER TABLE public.edges OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 21287)
-- Name: faqs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faqs (
    faq_id integer NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    category character varying(100)
);


ALTER TABLE public.faqs OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 21286)
-- Name: faqs_faq_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.faqs_faq_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.faqs_faq_id_seq OWNER TO postgres;

--
-- TOC entry 5243 (class 0 OID 0)
-- Dependencies: 271
-- Name: faqs_faq_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faqs_faq_id_seq OWNED BY public.faqs.faq_id;


--
-- TOC entry 270 (class 1259 OID 21133)
-- Name: flow_forecasts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flow_forecasts (
    area_id text,
    forecast_density double precision,
    status_warning text,
    time_offset integer,
    map_id integer DEFAULT 1
);


ALTER TABLE public.flow_forecasts OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 21050)
-- Name: heatmap_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.heatmap_data (
    id integer NOT NULL,
    route_id text,
    x double precision,
    y double precision,
    density_value double precision,
    status_message text,
    radius double precision
);


ALTER TABLE public.heatmap_data OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 21049)
-- Name: heatmap_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.heatmap_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.heatmap_data_id_seq OWNER TO postgres;

--
-- TOC entry 5244 (class 0 OID 0)
-- Dependencies: 257
-- Name: heatmap_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.heatmap_data_id_seq OWNED BY public.heatmap_data.id;


--
-- TOC entry 249 (class 1259 OID 20992)
-- Name: heatmaps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.heatmaps (
    id integer NOT NULL,
    node_id character varying(50) NOT NULL,
    density_score integer NOT NULL,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT heatmaps_density_score_check CHECK (((density_score >= 1) AND (density_score <= 10)))
);


ALTER TABLE public.heatmaps OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 20991)
-- Name: heatmaps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.heatmaps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.heatmaps_id_seq OWNER TO postgres;

--
-- TOC entry 5245 (class 0 OID 0)
-- Dependencies: 248
-- Name: heatmaps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.heatmaps_id_seq OWNED BY public.heatmaps.id;


--
-- TOC entry 268 (class 1259 OID 21110)
-- Name: hourly_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hourly_stats (
    id integer NOT NULL,
    stats_date date NOT NULL,
    hour text NOT NULL,
    area_id text,
    total_visitors integer DEFAULT 0
);


ALTER TABLE public.hourly_stats OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 21109)
-- Name: hourly_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hourly_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hourly_stats_id_seq OWNER TO postgres;

--
-- TOC entry 5246 (class 0 OID 0)
-- Dependencies: 267
-- Name: hourly_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hourly_stats_id_seq OWNED BY public.hourly_stats.id;


--
-- TOC entry 220 (class 1259 OID 20737)
-- Name: maps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maps (
    id integer NOT NULL,
    building_code character varying(50) NOT NULL,
    building_name character varying(100) NOT NULL,
    image_url character varying(255),
    scale_x double precision NOT NULL,
    scale_y double precision NOT NULL
);


ALTER TABLE public.maps OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 20736)
-- Name: maps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maps_id_seq OWNER TO postgres;

--
-- TOC entry 5247 (class 0 OID 0)
-- Dependencies: 219
-- Name: maps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maps_id_seq OWNED BY public.maps.id;


--
-- TOC entry 237 (class 1259 OID 20867)
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    sender_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 20866)
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- TOC entry 5248 (class 0 OID 0)
-- Dependencies: 236
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- TOC entry 227 (class 1259 OID 20781)
-- Name: nodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nodes (
    id character varying(50) NOT NULL,
    map_id integer NOT NULL,
    x_coordinate double precision NOT NULL,
    y_coordinate double precision NOT NULL,
    type public.node_type DEFAULT 'hallway'::public.node_type NOT NULL,
    is_passable boolean DEFAULT true NOT NULL
);


ALTER TABLE public.nodes OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 21006)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    type public.notification_type NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 21005)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- TOC entry 5249 (class 0 OID 0)
-- Dependencies: 250
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 256 (class 1259 OID 21041)
-- Name: obstacles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.obstacles (
    id integer NOT NULL,
    route_id text,
    type text,
    x_coordinate double precision,
    y_coordinate double precision,
    description text,
    status text
);


ALTER TABLE public.obstacles OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 21040)
-- Name: obstacles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.obstacles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.obstacles_id_seq OWNER TO postgres;

--
-- TOC entry 5250 (class 0 OID 0)
-- Dependencies: 255
-- Name: obstacles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.obstacles_id_seq OWNED BY public.obstacles.id;


--
-- TOC entry 226 (class 1259 OID 20768)
-- Name: otps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otps (
    id integer NOT NULL,
    phone character varying(20) NOT NULL,
    user_id integer,
    otp_code character varying(6) NOT NULL,
    type public.otp_type NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.otps OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 20767)
-- Name: otps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.otps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.otps_id_seq OWNER TO postgres;

--
-- TOC entry 5251 (class 0 OID 0)
-- Dependencies: 225
-- Name: otps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.otps_id_seq OWNED BY public.otps.id;


--
-- TOC entry 282 (class 1259 OID 21328)
-- Name: parking_lots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parking_lots (
    parking_id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50),
    total_slots integer,
    available_slots integer,
    location_node_id character varying(50)
);


ALTER TABLE public.parking_lots OWNER TO postgres;

--
-- TOC entry 281 (class 1259 OID 21327)
-- Name: parking_lots_parking_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parking_lots_parking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parking_lots_parking_id_seq OWNER TO postgres;

--
-- TOC entry 5252 (class 0 OID 0)
-- Dependencies: 281
-- Name: parking_lots_parking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parking_lots_parking_id_seq OWNED BY public.parking_lots.parking_id;


--
-- TOC entry 235 (class 1259 OID 20849)
-- Name: participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.participants (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    user_id integer NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.participants OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 20848)
-- Name: participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participants_id_seq OWNER TO postgres;

--
-- TOC entry 5253 (class 0 OID 0)
-- Dependencies: 234
-- Name: participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.participants_id_seq OWNED BY public.participants.id;


--
-- TOC entry 245 (class 1259 OID 20950)
-- Name: paths; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paths (
    id integer NOT NULL,
    user_id integer NOT NULL,
    start_node_id character varying(50) NOT NULL,
    end_node_id character varying(50) NOT NULL,
    total_distance double precision NOT NULL,
    status public.path_status DEFAULT 'ongoing'::public.path_status NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.paths OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 20949)
-- Name: paths_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.paths_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.paths_id_seq OWNER TO postgres;

--
-- TOC entry 5254 (class 0 OID 0)
-- Dependencies: 244
-- Name: paths_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.paths_id_seq OWNED BY public.paths.id;


--
-- TOC entry 278 (class 1259 OID 21314)
-- Name: pharmacies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pharmacies (
    pharmacy_id integer NOT NULL,
    name character varying(100) NOT NULL,
    location_id character varying(50),
    opening_hours character varying(100)
);


ALTER TABLE public.pharmacies OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 21313)
-- Name: pharmacies_pharmacy_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pharmacies_pharmacy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pharmacies_pharmacy_id_seq OWNER TO postgres;

--
-- TOC entry 5255 (class 0 OID 0)
-- Dependencies: 277
-- Name: pharmacies_pharmacy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pharmacies_pharmacy_id_seq OWNED BY public.pharmacies.pharmacy_id;


--
-- TOC entry 254 (class 1259 OID 21033)
-- Name: route_density; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.route_density (
    route_id text NOT NULL,
    current_people integer
);


ALTER TABLE public.route_density OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 21023)
-- Name: routes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.routes (
    id integer NOT NULL,
    route_id text
);


ALTER TABLE public.routes OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 21022)
-- Name: routes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.routes_id_seq OWNER TO postgres;

--
-- TOC entry 5256 (class 0 OID 0)
-- Dependencies: 252
-- Name: routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.routes_id_seq OWNED BY public.routes.id;


--
-- TOC entry 247 (class 1259 OID 20974)
-- Name: saved_searches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saved_searches (
    id integer NOT NULL,
    user_id integer NOT NULL,
    target_node_id character varying(50) NOT NULL,
    keyword character varying(100) NOT NULL,
    searched_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.saved_searches OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 20973)
-- Name: saved_searches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.saved_searches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saved_searches_id_seq OWNER TO postgres;

--
-- TOC entry 5257 (class 0 OID 0)
-- Dependencies: 246
-- Name: saved_searches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.saved_searches_id_seq OWNED BY public.saved_searches.id;


--
-- TOC entry 265 (class 1259 OID 21089)
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    user_id integer,
    token character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 21088)
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO postgres;

--
-- TOC entry 5258 (class 0 OID 0)
-- Dependencies: 264
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- TOC entry 224 (class 1259 OID 20752)
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    language character varying(10) DEFAULT 'vi'::character varying NOT NULL,
    voice_navigation boolean DEFAULT true NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 20751)
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO postgres;

--
-- TOC entry 5259 (class 0 OID 0)
-- Dependencies: 223
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- TOC entry 274 (class 1259 OID 21296)
-- Name: sos_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sos_requests (
    id integer NOT NULL,
    token character varying(255) NOT NULL,
    node_id character varying(50) NOT NULL,
    note text,
    status character varying(50) DEFAULT 'received'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sos_requests OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 21295)
-- Name: sos_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sos_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sos_requests_id_seq OWNER TO postgres;

--
-- TOC entry 5260 (class 0 OID 0)
-- Dependencies: 273
-- Name: sos_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sos_requests_id_seq OWNED BY public.sos_requests.id;


--
-- TOC entry 243 (class 1259 OID 20931)
-- Name: spendings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.spendings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    treatment_id integer,
    amount numeric(12,2) NOT NULL,
    description character varying(255),
    status public.spending_status DEFAULT 'pending'::public.spending_status NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.spendings OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 20930)
-- Name: spendings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.spendings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.spendings_id_seq OWNER TO postgres;

--
-- TOC entry 5261 (class 0 OID 0)
-- Dependencies: 242
-- Name: spendings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.spendings_id_seq OWNED BY public.spendings.id;


--
-- TOC entry 239 (class 1259 OID 20887)
-- Name: staffs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staffs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    ward_id integer NOT NULL,
    role public.staff_role NOT NULL,
    status public.staff_status DEFAULT 'offline'::public.staff_status NOT NULL
);


ALTER TABLE public.staffs OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 20886)
-- Name: staffs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staffs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staffs_id_seq OWNER TO postgres;

--
-- TOC entry 5262 (class 0 OID 0)
-- Dependencies: 238
-- Name: staffs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staffs_id_seq OWNED BY public.staffs.id;


--
-- TOC entry 229 (class 1259 OID 20794)
-- Name: steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.steps (
    id integer NOT NULL,
    map_id integer NOT NULL,
    start_node_id character varying(50) NOT NULL,
    end_node_id character varying(50) NOT NULL,
    distance double precision NOT NULL,
    direction character varying(50),
    instruction character varying(255)
);


ALTER TABLE public.steps OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 20793)
-- Name: steps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.steps_id_seq OWNER TO postgres;

--
-- TOC entry 5263 (class 0 OID 0)
-- Dependencies: 228
-- Name: steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.steps_id_seq OWNED BY public.steps.id;


--
-- TOC entry 241 (class 1259 OID 20907)
-- Name: treatments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.treatments (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    ward_id integer NOT NULL,
    status public.treatment_status DEFAULT 'pending'::public.treatment_status NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.treatments OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 20906)
-- Name: treatments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.treatments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.treatments_id_seq OWNER TO postgres;

--
-- TOC entry 5264 (class 0 OID 0)
-- Dependencies: 240
-- Name: treatments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.treatments_id_seq OWNED BY public.treatments.id;


--
-- TOC entry 266 (class 1259 OID 21101)
-- Name: user_devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_devices (
    user_token text NOT NULL,
    device_token text NOT NULL,
    last_updated timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_devices OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 20726)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    phone character varying(20) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(100) NOT NULL,
    status public.user_status DEFAULT 'active'::public.user_status NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 20725)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5265 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 231 (class 1259 OID 20816)
-- Name: wards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wards (
    id integer NOT NULL,
    map_node_id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    status public.ward_status DEFAULT 'open'::public.ward_status NOT NULL
);


ALTER TABLE public.wards OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 20815)
-- Name: wards_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wards_id_seq OWNER TO postgres;

--
-- TOC entry 5266 (class 0 OID 0)
-- Dependencies: 230
-- Name: wards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wards_id_seq OWNED BY public.wards.id;


--
-- TOC entry 276 (class 1259 OID 21307)
-- Name: wifi_networks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wifi_networks (
    id integer NOT NULL,
    ssid character varying(100) NOT NULL,
    password character varying(100),
    coverage_zone character varying(100),
    location_node_id character varying(50)
);


ALTER TABLE public.wifi_networks OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 21306)
-- Name: wifi_networks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wifi_networks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wifi_networks_id_seq OWNER TO postgres;

--
-- TOC entry 5267 (class 0 OID 0)
-- Dependencies: 275
-- Name: wifi_networks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wifi_networks_id_seq OWNED BY public.wifi_networks.id;


--
-- TOC entry 4896 (class 2604 OID 21062)
-- Name: bottlenecks_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bottlenecks_data ALTER COLUMN id SET DEFAULT nextval('public.bottlenecks_data_id_seq'::regclass);


--
-- TOC entry 4910 (class 2604 OID 21324)
-- Name: canteens canteen_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.canteens ALTER COLUMN canteen_id SET DEFAULT nextval('public.canteens_canteen_id_seq'::regclass);


--
-- TOC entry 4856 (class 2604 OID 20747)
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- TOC entry 4869 (class 2604 OID 20834)
-- Name: devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq'::regclass);


--
-- TOC entry 4904 (class 2604 OID 21290)
-- Name: faqs faq_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faqs ALTER COLUMN faq_id SET DEFAULT nextval('public.faqs_faq_id_seq'::regclass);


--
-- TOC entry 4895 (class 2604 OID 21053)
-- Name: heatmap_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.heatmap_data ALTER COLUMN id SET DEFAULT nextval('public.heatmap_data_id_seq'::regclass);


--
-- TOC entry 4888 (class 2604 OID 20995)
-- Name: heatmaps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.heatmaps ALTER COLUMN id SET DEFAULT nextval('public.heatmaps_id_seq'::regclass);


--
-- TOC entry 4900 (class 2604 OID 21113)
-- Name: hourly_stats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hourly_stats ALTER COLUMN id SET DEFAULT nextval('public.hourly_stats_id_seq'::regclass);


--
-- TOC entry 4855 (class 2604 OID 20740)
-- Name: maps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maps ALTER COLUMN id SET DEFAULT nextval('public.maps_id_seq'::regclass);


--
-- TOC entry 4873 (class 2604 OID 20870)
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- TOC entry 4890 (class 2604 OID 21009)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 4894 (class 2604 OID 21044)
-- Name: obstacles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obstacles ALTER COLUMN id SET DEFAULT nextval('public.obstacles_id_seq'::regclass);


--
-- TOC entry 4861 (class 2604 OID 20771)
-- Name: otps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otps ALTER COLUMN id SET DEFAULT nextval('public.otps_id_seq'::regclass);


--
-- TOC entry 4911 (class 2604 OID 21331)
-- Name: parking_lots parking_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parking_lots ALTER COLUMN parking_id SET DEFAULT nextval('public.parking_lots_parking_id_seq'::regclass);


--
-- TOC entry 4871 (class 2604 OID 20852)
-- Name: participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants ALTER COLUMN id SET DEFAULT nextval('public.participants_id_seq'::regclass);


--
-- TOC entry 4883 (class 2604 OID 20953)
-- Name: paths id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paths ALTER COLUMN id SET DEFAULT nextval('public.paths_id_seq'::regclass);


--
-- TOC entry 4909 (class 2604 OID 21317)
-- Name: pharmacies pharmacy_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pharmacies ALTER COLUMN pharmacy_id SET DEFAULT nextval('public.pharmacies_pharmacy_id_seq'::regclass);


--
-- TOC entry 4893 (class 2604 OID 21026)
-- Name: routes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routes ALTER COLUMN id SET DEFAULT nextval('public.routes_id_seq'::regclass);


--
-- TOC entry 4886 (class 2604 OID 20977)
-- Name: saved_searches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_searches ALTER COLUMN id SET DEFAULT nextval('public.saved_searches_id_seq'::regclass);


--
-- TOC entry 4897 (class 2604 OID 21092)
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- TOC entry 4858 (class 2604 OID 20755)
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- TOC entry 4905 (class 2604 OID 21299)
-- Name: sos_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sos_requests ALTER COLUMN id SET DEFAULT nextval('public.sos_requests_id_seq'::regclass);


--
-- TOC entry 4880 (class 2604 OID 20934)
-- Name: spendings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spendings ALTER COLUMN id SET DEFAULT nextval('public.spendings_id_seq'::regclass);


--
-- TOC entry 4875 (class 2604 OID 20890)
-- Name: staffs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staffs ALTER COLUMN id SET DEFAULT nextval('public.staffs_id_seq'::regclass);


--
-- TOC entry 4866 (class 2604 OID 20797)
-- Name: steps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.steps ALTER COLUMN id SET DEFAULT nextval('public.steps_id_seq'::regclass);


--
-- TOC entry 4877 (class 2604 OID 20910)
-- Name: treatments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatments ALTER COLUMN id SET DEFAULT nextval('public.treatments_id_seq'::regclass);


--
-- TOC entry 4852 (class 2604 OID 20729)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4867 (class 2604 OID 20819)
-- Name: wards id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards ALTER COLUMN id SET DEFAULT nextval('public.wards_id_seq'::regclass);


--
-- TOC entry 4908 (class 2604 OID 21310)
-- Name: wifi_networks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wifi_networks ALTER COLUMN id SET DEFAULT nextval('public.wifi_networks_id_seq'::regclass);


--
-- TOC entry 5220 (class 0 OID 21119)
-- Dependencies: 269
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.areas (area_id, map_id) FROM stdin;
\.


--
-- TOC entry 5211 (class 0 OID 21059)
-- Dependencies: 260
-- Data for Name: bottlenecks_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bottlenecks_data (id, route_id, edge_name, x, y, occupancy_rate) FROM stdin;
\.


--
-- TOC entry 5231 (class 0 OID 21321)
-- Dependencies: 280
-- Data for Name: canteens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.canteens (canteen_id, name, location_node_id, open_time, close_time, menu_url, zone_id) FROM stdin;
\.


--
-- TOC entry 5173 (class 0 OID 20744)
-- Dependencies: 222
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, type, created_at) FROM stdin;
1	direct	2026-05-10 23:03:43.936221
2	direct	2026-05-10 23:03:45.603582
3	direct	2026-05-10 22:03:45.60617
4	direct	2026-05-10 23:03:46.30624
5	direct	2026-05-10 23:15:03.63292
6	direct	2026-05-10 23:15:06.144758
7	direct	2026-05-10 23:15:07.321001
8	direct	2026-05-10 22:15:07.323667
9	direct	2026-05-10 23:23:38.554338
10	direct	2026-05-10 23:23:42.446237
11	direct	2026-05-10 23:23:43.864719
12	direct	2026-05-10 22:23:43.867679
13	direct	2026-05-10 23:29:45.734052
14	direct	2026-05-10 23:29:47.924798
15	direct	2026-05-10 22:29:47.928207
16	direct	2026-05-10 23:29:49.972144
17	direct	2026-05-10 23:36:47.164221
18	direct	2026-05-10 23:36:52.620702
19	direct	2026-05-10 22:36:52.623452
20	direct	2026-05-10 23:36:53.610154
21	direct	2026-05-10 23:45:03.487199
22	direct	2026-05-10 23:45:07.070481
23	direct	2026-05-10 23:45:08.168216
24	direct	2026-05-10 22:45:08.170792
\.


--
-- TOC entry 5184 (class 0 OID 20831)
-- Dependencies: 233
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.devices (id, current_node_id, assigned_user_id, type, status) FROM stdin;
\.


--
-- TOC entry 5214 (class 0 OID 21081)
-- Dependencies: 263
-- Data for Name: edge_density; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.edge_density (edge_id, current_count, fill_percentage) FROM stdin;
\.


--
-- TOC entry 5213 (class 0 OID 21074)
-- Dependencies: 262
-- Data for Name: edge_status; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.edge_status (edge_id, occupancy_rate) FROM stdin;
\.


--
-- TOC entry 5212 (class 0 OID 21067)
-- Dependencies: 261
-- Data for Name: edges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.edges (edge_id) FROM stdin;
\.


--
-- TOC entry 5223 (class 0 OID 21287)
-- Dependencies: 272
-- Data for Name: faqs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faqs (faq_id, question, answer, category) FROM stdin;
\.


--
-- TOC entry 5221 (class 0 OID 21133)
-- Dependencies: 270
-- Data for Name: flow_forecasts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flow_forecasts (area_id, forecast_density, status_warning, time_offset, map_id) FROM stdin;
\.


--
-- TOC entry 5209 (class 0 OID 21050)
-- Dependencies: 258
-- Data for Name: heatmap_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.heatmap_data (id, route_id, x, y, density_value, status_message, radius) FROM stdin;
\.


--
-- TOC entry 5200 (class 0 OID 20992)
-- Dependencies: 249
-- Data for Name: heatmaps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.heatmaps (id, node_id, density_score, recorded_at) FROM stdin;
\.


--
-- TOC entry 5219 (class 0 OID 21110)
-- Dependencies: 268
-- Data for Name: hourly_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hourly_stats (id, stats_date, hour, area_id, total_visitors) FROM stdin;
\.


--
-- TOC entry 5171 (class 0 OID 20737)
-- Dependencies: 220
-- Data for Name: maps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maps (id, building_code, building_name, image_url, scale_x, scale_y) FROM stdin;
1	BUILD_A	Building A	\N	1	1
\.


--
-- TOC entry 5188 (class 0 OID 20867)
-- Dependencies: 237
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, conversation_id, sender_id, content, created_at) FROM stdin;
\.


--
-- TOC entry 5178 (class 0 OID 20781)
-- Dependencies: 227
-- Data for Name: nodes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nodes (id, map_id, x_coordinate, y_coordinate, type, is_passable) FROM stdin;
NODE_001	1	0	0	hallway	t
\.


--
-- TOC entry 5202 (class 0 OID 21006)
-- Dependencies: 251
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, body, type, is_read, created_at) FROM stdin;
1681	1005	Title 1	Body 1	alert	f	2026-05-11 02:59:15.488263
1682	1005	Title 2	Body 2	system	f	2026-05-11 02:59:15.492253
1683	1005	Title 3	Body 3	alert	f	2026-05-11 02:59:15.494297
1684	1005	Title 4	Body 4	system	f	2026-05-11 02:59:15.496229
1685	1005	Title 5	Body 5	alert	f	2026-05-11 02:59:15.498165
1686	1005	Title 6	Body 6	system	f	2026-05-11 02:59:15.49983
1687	1005	Title 7	Body 7	alert	f	2026-05-11 02:59:15.50142
1688	1005	Title 8	Body 8	system	f	2026-05-11 02:59:15.502932
1689	1005	Title 9	Body 9	alert	f	2026-05-11 02:59:15.504447
1690	1005	Title 10	Body 10	system	f	2026-05-11 02:59:15.505982
1691	1005	Title 11	Body 11	alert	f	2026-05-11 02:59:15.507491
1692	1005	Title 12	Body 12	system	f	2026-05-11 02:59:15.510589
1693	1005	Title 13	Body 13	alert	f	2026-05-11 02:59:15.512449
1694	1005	Title 14	Body 14	system	f	2026-05-11 02:59:15.513988
1695	1005	Title 15	Body 15	alert	f	2026-05-11 02:59:15.515538
\.


--
-- TOC entry 5207 (class 0 OID 21041)
-- Dependencies: 256
-- Data for Name: obstacles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.obstacles (id, route_id, type, x_coordinate, y_coordinate, description, status) FROM stdin;
\.


--
-- TOC entry 5177 (class 0 OID 20768)
-- Dependencies: 226
-- Data for Name: otps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.otps (id, phone, user_id, otp_code, type, expires_at, is_used, created_at) FROM stdin;
\.


--
-- TOC entry 5233 (class 0 OID 21328)
-- Dependencies: 282
-- Data for Name: parking_lots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parking_lots (parking_id, name, type, total_slots, available_slots, location_node_id) FROM stdin;
\.


--
-- TOC entry 5186 (class 0 OID 20849)
-- Dependencies: 235
-- Data for Name: participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.participants (id, conversation_id, user_id, joined_at) FROM stdin;
\.


--
-- TOC entry 5196 (class 0 OID 20950)
-- Dependencies: 245
-- Data for Name: paths; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paths (id, user_id, start_node_id, end_node_id, total_distance, status, created_at) FROM stdin;
\.


--
-- TOC entry 5229 (class 0 OID 21314)
-- Dependencies: 278
-- Data for Name: pharmacies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pharmacies (pharmacy_id, name, location_id, opening_hours) FROM stdin;
\.


--
-- TOC entry 5205 (class 0 OID 21033)
-- Dependencies: 254
-- Data for Name: route_density; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.route_density (route_id, current_people) FROM stdin;
\.


--
-- TOC entry 5204 (class 0 OID 21023)
-- Dependencies: 253
-- Data for Name: routes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.routes (id, route_id) FROM stdin;
\.


--
-- TOC entry 5198 (class 0 OID 20974)
-- Dependencies: 247
-- Data for Name: saved_searches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.saved_searches (id, user_id, target_node_id, keyword, searched_at) FROM stdin;
\.


--
-- TOC entry 5216 (class 0 OID 21089)
-- Dependencies: 265
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, token, created_at) FROM stdin;
\.


--
-- TOC entry 5175 (class 0 OID 20752)
-- Dependencies: 224
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, user_id, language, voice_navigation) FROM stdin;
\.


--
-- TOC entry 5225 (class 0 OID 21296)
-- Dependencies: 274
-- Data for Name: sos_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sos_requests (id, token, node_id, note, status, created_at) FROM stdin;
\.


--
-- TOC entry 5194 (class 0 OID 20931)
-- Dependencies: 243
-- Data for Name: spendings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.spendings (id, user_id, treatment_id, amount, description, status, created_at) FROM stdin;
\.


--
-- TOC entry 5190 (class 0 OID 20887)
-- Dependencies: 239
-- Data for Name: staffs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staffs (id, user_id, ward_id, role, status) FROM stdin;
\.


--
-- TOC entry 5180 (class 0 OID 20794)
-- Dependencies: 229
-- Data for Name: steps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.steps (id, map_id, start_node_id, end_node_id, distance, direction, instruction) FROM stdin;
\.


--
-- TOC entry 5192 (class 0 OID 20907)
-- Dependencies: 241
-- Data for Name: treatments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.treatments (id, patient_id, doctor_id, ward_id, status, created_at) FROM stdin;
\.


--
-- TOC entry 5217 (class 0 OID 21101)
-- Dependencies: 266
-- Data for Name: user_devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_devices (user_token, device_token, last_updated) FROM stdin;
\.


--
-- TOC entry 5169 (class 0 OID 20726)
-- Dependencies: 218
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, phone, password_hash, full_name, status, created_at) FROM stdin;
1005	1005	hash	User A	active	2026-05-11 02:59:15.479384
1006	1006	hash	User B	active	2026-05-11 02:59:15.483001
1003	1003	hash	User A	active	2026-05-11 02:59:23.953609
1004	1004	hash	User B	active	2026-05-11 02:59:23.957187
1001	1001	hash	User A	active	2026-05-11 02:59:24.57578
1002	1002	hash	User B	active	2026-05-11 02:59:24.579603
\.


--
-- TOC entry 5182 (class 0 OID 20816)
-- Dependencies: 231
-- Data for Name: wards; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wards (id, map_node_id, name, status) FROM stdin;
\.


--
-- TOC entry 5227 (class 0 OID 21307)
-- Dependencies: 276
-- Data for Name: wifi_networks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wifi_networks (id, ssid, password, coverage_zone, location_node_id) FROM stdin;
\.


--
-- TOC entry 5268 (class 0 OID 0)
-- Dependencies: 259
-- Name: bottlenecks_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bottlenecks_data_id_seq', 77, true);


--
-- TOC entry 5269 (class 0 OID 0)
-- Dependencies: 279
-- Name: canteens_canteen_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.canteens_canteen_id_seq', 1, false);


--
-- TOC entry 5270 (class 0 OID 0)
-- Dependencies: 221
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conversations_id_seq', 381, true);


--
-- TOC entry 5271 (class 0 OID 0)
-- Dependencies: 232
-- Name: devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.devices_id_seq', 67, true);


--
-- TOC entry 5272 (class 0 OID 0)
-- Dependencies: 271
-- Name: faqs_faq_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.faqs_faq_id_seq', 7, true);


--
-- TOC entry 5273 (class 0 OID 0)
-- Dependencies: 257
-- Name: heatmap_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.heatmap_data_id_seq', 81, true);


--
-- TOC entry 5274 (class 0 OID 0)
-- Dependencies: 248
-- Name: heatmaps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.heatmaps_id_seq', 1, false);


--
-- TOC entry 5275 (class 0 OID 0)
-- Dependencies: 267
-- Name: hourly_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.hourly_stats_id_seq', 192, true);


--
-- TOC entry 5276 (class 0 OID 0)
-- Dependencies: 219
-- Name: maps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maps_id_seq', 1957, true);


--
-- TOC entry 5277 (class 0 OID 0)
-- Dependencies: 236
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 110, true);


--
-- TOC entry 5278 (class 0 OID 0)
-- Dependencies: 250
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1699, true);


--
-- TOC entry 5279 (class 0 OID 0)
-- Dependencies: 255
-- Name: obstacles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.obstacles_id_seq', 134, true);


--
-- TOC entry 5280 (class 0 OID 0)
-- Dependencies: 225
-- Name: otps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.otps_id_seq', 123, true);


--
-- TOC entry 5281 (class 0 OID 0)
-- Dependencies: 281
-- Name: parking_lots_parking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parking_lots_parking_id_seq', 1, false);


--
-- TOC entry 5282 (class 0 OID 0)
-- Dependencies: 234
-- Name: participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.participants_id_seq', 352, true);


--
-- TOC entry 5283 (class 0 OID 0)
-- Dependencies: 244
-- Name: paths_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.paths_id_seq', 1, false);


--
-- TOC entry 5284 (class 0 OID 0)
-- Dependencies: 277
-- Name: pharmacies_pharmacy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pharmacies_pharmacy_id_seq', 1, false);


--
-- TOC entry 5285 (class 0 OID 0)
-- Dependencies: 252
-- Name: routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.routes_id_seq', 468, true);


--
-- TOC entry 5286 (class 0 OID 0)
-- Dependencies: 246
-- Name: saved_searches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.saved_searches_id_seq', 401, true);


--
-- TOC entry 5287 (class 0 OID 0)
-- Dependencies: 264
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- TOC entry 5288 (class 0 OID 0)
-- Dependencies: 223
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.settings_id_seq', 1, false);


--
-- TOC entry 5289 (class 0 OID 0)
-- Dependencies: 273
-- Name: sos_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sos_requests_id_seq', 60, true);


--
-- TOC entry 5290 (class 0 OID 0)
-- Dependencies: 242
-- Name: spendings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.spendings_id_seq', 1, false);


--
-- TOC entry 5291 (class 0 OID 0)
-- Dependencies: 238
-- Name: staffs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.staffs_id_seq', 282, true);


--
-- TOC entry 5292 (class 0 OID 0)
-- Dependencies: 228
-- Name: steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.steps_id_seq', 1524, true);


--
-- TOC entry 5293 (class 0 OID 0)
-- Dependencies: 240
-- Name: treatments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.treatments_id_seq', 1, false);


--
-- TOC entry 5294 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2465, true);


--
-- TOC entry 5295 (class 0 OID 0)
-- Dependencies: 230
-- Name: wards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.wards_id_seq', 480, true);


--
-- TOC entry 5296 (class 0 OID 0)
-- Dependencies: 275
-- Name: wifi_networks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.wifi_networks_id_seq', 14, true);


--
-- TOC entry 4982 (class 2606 OID 21126)
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (area_id);


--
-- TOC entry 4968 (class 2606 OID 21066)
-- Name: bottlenecks_data bottlenecks_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bottlenecks_data
    ADD CONSTRAINT bottlenecks_data_pkey PRIMARY KEY (id);


--
-- TOC entry 4992 (class 2606 OID 21326)
-- Name: canteens canteens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.canteens
    ADD CONSTRAINT canteens_pkey PRIMARY KEY (canteen_id);


--
-- TOC entry 4920 (class 2606 OID 20750)
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 4936 (class 2606 OID 20837)
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- TOC entry 4974 (class 2606 OID 21087)
-- Name: edge_density edge_density_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_density
    ADD CONSTRAINT edge_density_pkey PRIMARY KEY (edge_id);


--
-- TOC entry 4972 (class 2606 OID 21080)
-- Name: edge_status edge_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_status
    ADD CONSTRAINT edge_status_pkey PRIMARY KEY (edge_id);


--
-- TOC entry 4970 (class 2606 OID 21073)
-- Name: edges edges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edges
    ADD CONSTRAINT edges_pkey PRIMARY KEY (edge_id);


--
-- TOC entry 4984 (class 2606 OID 21294)
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (faq_id);


--
-- TOC entry 4966 (class 2606 OID 21057)
-- Name: heatmap_data heatmap_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.heatmap_data
    ADD CONSTRAINT heatmap_data_pkey PRIMARY KEY (id);


--
-- TOC entry 4954 (class 2606 OID 20999)
-- Name: heatmaps heatmaps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.heatmaps
    ADD CONSTRAINT heatmaps_pkey PRIMARY KEY (id);


--
-- TOC entry 4980 (class 2606 OID 21118)
-- Name: hourly_stats hourly_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hourly_stats
    ADD CONSTRAINT hourly_stats_pkey PRIMARY KEY (id);


--
-- TOC entry 4918 (class 2606 OID 20742)
-- Name: maps maps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maps
    ADD CONSTRAINT maps_pkey PRIMARY KEY (id);


--
-- TOC entry 4940 (class 2606 OID 20875)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4928 (class 2606 OID 20787)
-- Name: nodes nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nodes
    ADD CONSTRAINT nodes_pkey PRIMARY KEY (id);


--
-- TOC entry 4956 (class 2606 OID 21015)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4964 (class 2606 OID 21048)
-- Name: obstacles obstacles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obstacles
    ADD CONSTRAINT obstacles_pkey PRIMARY KEY (id);


--
-- TOC entry 4926 (class 2606 OID 20775)
-- Name: otps otps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otps
    ADD CONSTRAINT otps_pkey PRIMARY KEY (id);


--
-- TOC entry 4994 (class 2606 OID 21333)
-- Name: parking_lots parking_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parking_lots
    ADD CONSTRAINT parking_lots_pkey PRIMARY KEY (parking_id);


--
-- TOC entry 4938 (class 2606 OID 20855)
-- Name: participants participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);


--
-- TOC entry 4950 (class 2606 OID 20957)
-- Name: paths paths_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paths
    ADD CONSTRAINT paths_pkey PRIMARY KEY (id);


--
-- TOC entry 4990 (class 2606 OID 21319)
-- Name: pharmacies pharmacies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pharmacies
    ADD CONSTRAINT pharmacies_pkey PRIMARY KEY (pharmacy_id);


--
-- TOC entry 4962 (class 2606 OID 21039)
-- Name: route_density route_density_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.route_density
    ADD CONSTRAINT route_density_pkey PRIMARY KEY (route_id);


--
-- TOC entry 4958 (class 2606 OID 21030)
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- TOC entry 4960 (class 2606 OID 21032)
-- Name: routes routes_route_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_route_id_key UNIQUE (route_id);


--
-- TOC entry 4952 (class 2606 OID 20980)
-- Name: saved_searches saved_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_pkey PRIMARY KEY (id);


--
-- TOC entry 4976 (class 2606 OID 21095)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4922 (class 2606 OID 20759)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4924 (class 2606 OID 20761)
-- Name: settings settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_user_id_key UNIQUE (user_id);


--
-- TOC entry 4986 (class 2606 OID 21305)
-- Name: sos_requests sos_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sos_requests
    ADD CONSTRAINT sos_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4948 (class 2606 OID 20938)
-- Name: spendings spendings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spendings
    ADD CONSTRAINT spendings_pkey PRIMARY KEY (id);


--
-- TOC entry 4942 (class 2606 OID 20893)
-- Name: staffs staffs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staffs
    ADD CONSTRAINT staffs_pkey PRIMARY KEY (id);


--
-- TOC entry 4944 (class 2606 OID 20895)
-- Name: staffs staffs_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staffs
    ADD CONSTRAINT staffs_user_id_key UNIQUE (user_id);


--
-- TOC entry 4930 (class 2606 OID 20799)
-- Name: steps steps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.steps
    ADD CONSTRAINT steps_pkey PRIMARY KEY (id);


--
-- TOC entry 4946 (class 2606 OID 20914)
-- Name: treatments treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_pkey PRIMARY KEY (id);


--
-- TOC entry 4978 (class 2606 OID 21108)
-- Name: user_devices user_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_pkey PRIMARY KEY (user_token);


--
-- TOC entry 4914 (class 2606 OID 20735)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 4916 (class 2606 OID 20733)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4932 (class 2606 OID 20824)
-- Name: wards wards_map_node_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_map_node_id_key UNIQUE (map_node_id);


--
-- TOC entry 4934 (class 2606 OID 20822)
-- Name: wards wards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_pkey PRIMARY KEY (id);


--
-- TOC entry 4988 (class 2606 OID 21312)
-- Name: wifi_networks wifi_networks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wifi_networks
    ADD CONSTRAINT wifi_networks_pkey PRIMARY KEY (id);


--
-- TOC entry 5002 (class 2606 OID 20843)
-- Name: devices devices_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5003 (class 2606 OID 20838)
-- Name: devices devices_current_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_current_node_id_fkey FOREIGN KEY (current_node_id) REFERENCES public.nodes(id);


--
-- TOC entry 5020 (class 2606 OID 21000)
-- Name: heatmaps heatmaps_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.heatmaps
    ADD CONSTRAINT heatmaps_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.nodes(id) ON DELETE CASCADE;


--
-- TOC entry 5006 (class 2606 OID 20876)
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- TOC entry 5007 (class 2606 OID 20881)
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4997 (class 2606 OID 20788)
-- Name: nodes nodes_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nodes
    ADD CONSTRAINT nodes_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.maps(id) ON DELETE CASCADE;


--
-- TOC entry 5021 (class 2606 OID 21016)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4996 (class 2606 OID 20776)
-- Name: otps otps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otps
    ADD CONSTRAINT otps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5004 (class 2606 OID 20856)
-- Name: participants participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- TOC entry 5005 (class 2606 OID 20861)
-- Name: participants participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5015 (class 2606 OID 20968)
-- Name: paths paths_end_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paths
    ADD CONSTRAINT paths_end_node_id_fkey FOREIGN KEY (end_node_id) REFERENCES public.nodes(id);


--
-- TOC entry 5016 (class 2606 OID 20963)
-- Name: paths paths_start_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paths
    ADD CONSTRAINT paths_start_node_id_fkey FOREIGN KEY (start_node_id) REFERENCES public.nodes(id);


--
-- TOC entry 5017 (class 2606 OID 20958)
-- Name: paths paths_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paths
    ADD CONSTRAINT paths_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5018 (class 2606 OID 20986)
-- Name: saved_searches saved_searches_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_target_node_id_fkey FOREIGN KEY (target_node_id) REFERENCES public.nodes(id);


--
-- TOC entry 5019 (class 2606 OID 20981)
-- Name: saved_searches saved_searches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5022 (class 2606 OID 21096)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4995 (class 2606 OID 20762)
-- Name: settings settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5013 (class 2606 OID 20944)
-- Name: spendings spendings_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spendings
    ADD CONSTRAINT spendings_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.treatments(id) ON DELETE SET NULL;


--
-- TOC entry 5014 (class 2606 OID 20939)
-- Name: spendings spendings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spendings
    ADD CONSTRAINT spendings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5008 (class 2606 OID 20896)
-- Name: staffs staffs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staffs
    ADD CONSTRAINT staffs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5009 (class 2606 OID 20901)
-- Name: staffs staffs_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staffs
    ADD CONSTRAINT staffs_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id);


--
-- TOC entry 4998 (class 2606 OID 20810)
-- Name: steps steps_end_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.steps
    ADD CONSTRAINT steps_end_node_id_fkey FOREIGN KEY (end_node_id) REFERENCES public.nodes(id);


--
-- TOC entry 4999 (class 2606 OID 20800)
-- Name: steps steps_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.steps
    ADD CONSTRAINT steps_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.maps(id) ON DELETE CASCADE;


--
-- TOC entry 5000 (class 2606 OID 20805)
-- Name: steps steps_start_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.steps
    ADD CONSTRAINT steps_start_node_id_fkey FOREIGN KEY (start_node_id) REFERENCES public.nodes(id);


--
-- TOC entry 5010 (class 2606 OID 20920)
-- Name: treatments treatments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staffs(id);


--
-- TOC entry 5011 (class 2606 OID 20915)
-- Name: treatments treatments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5012 (class 2606 OID 20925)
-- Name: treatments treatments_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id);


--
-- TOC entry 5001 (class 2606 OID 20825)
-- Name: wards wards_map_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_map_node_id_fkey FOREIGN KEY (map_node_id) REFERENCES public.nodes(id);


-- Completed on 2026-05-12 04:19:25

--
-- PostgreSQL database dump complete
--

