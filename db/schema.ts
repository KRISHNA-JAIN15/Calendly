import { boolean, check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { DAYS_OF_WEEK_IN_ORDER } from "../data/constants";
import { relations, sql } from "drizzle-orm";

const createdAt = timestamp("createdAt").notNull().defaultNow();
const updatedAt = timestamp("updatedAt").notNull().defaultNow().$onUpdate(() => new Date());

export const UserPublicProfileTable = pgTable(
    "userPublicProfiles",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        clerkUserId: text("clerkUserId").notNull().unique(),
        publicSlug: text("publicSlug").notNull(),
        createdAt,
        updatedAt,
    },
    (table) => [uniqueIndex("userPublicProfiles_publicSlug_idx").on(table.publicSlug)]
);

export const EventTable = pgTable(
    "events",
    {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
        slug: text("slug").notNull(),
        description: text("description"),
    durationInMinutes: integer("durationInMinutes").notNull(),
    clerkUserId: text("clerkUserId").notNull(),
        isActive: boolean("isActive").notNull().default(true),
    createdAt,
        updatedAt,
    },
    (table) => [
        index("events_clerkUserId_idx").on(table.clerkUserId),
        uniqueIndex("events_clerkUserId_slug_idx").on(table.clerkUserId, table.slug),
    ]
);

export const ScheduleTable = pgTable("schedules", {
    id: uuid("id").primaryKey().defaultRandom(),
    timezone: text("timezone").notNull(),
    clerkUserId: text("clerkUserId").notNull().unique(),
    createdAt,
    updatedAt,
});

export const scheduleDayOfWeekEnum = pgEnum("day", DAYS_OF_WEEK_IN_ORDER);

export const ScheduleAvailabilityTable = pgTable(
    "scheduleAvailabilities",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        scheduleId: uuid("scheduleId")
            .notNull()
            .references(() => ScheduleTable.id, { onDelete: "cascade" }),
        startTime: text("startTime").notNull(),
        endTime: text("endTime").notNull(),
        dayOfWeek: scheduleDayOfWeekEnum("dayOfWeek").notNull(),
    },
    (table) => [
        index("scheduleAvailabilities_scheduleId_idx").on(table.scheduleId),
        uniqueIndex("scheduleAvailabilities_unique_slot_idx").on(
            table.scheduleId,
            table.dayOfWeek,
            table.startTime,
            table.endTime
        ),
        check(
            "scheduleAvailabilities_start_before_end_check",
            sql`${table.startTime} < ${table.endTime}`
        ),
    ]
);

export const bookingStatusEnum = pgEnum("bookingStatus", [
    "confirmed",
    "cancelled",
]);

export const BookingTable = pgTable(
    "bookings",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        eventId: uuid("eventId")
            .notNull()
            .references(() => EventTable.id, { onDelete: "cascade" }),
        clerkUserId: text("clerkUserId").notNull(),
        inviteeName: text("inviteeName").notNull(),
        inviteeEmail: text("inviteeEmail").notNull(),
        startsAt: timestamp("startsAt").notNull(),
        endsAt: timestamp("endsAt").notNull(),
        timezone: text("timezone").notNull(),
        status: bookingStatusEnum("status").notNull().default("confirmed"),
        cancelledAt: timestamp("cancelledAt"),
        cancellationReason: text("cancellationReason"),
        createdAt,
        updatedAt,
    },
    (table) => [
        index("bookings_eventId_idx").on(table.eventId),
        index("bookings_startsAt_idx").on(table.startsAt),
        index("bookings_clerkUserId_startsAt_idx").on(table.clerkUserId, table.startsAt),
        uniqueIndex("bookings_event_slot_status_idx").on(table.eventId, table.startsAt, table.status),
        uniqueIndex("bookings_host_slot_status_idx").on(table.clerkUserId, table.startsAt, table.status),
        check("bookings_start_before_end_check", sql`${table.startsAt} < ${table.endsAt}`),
    ]
);

export const EventRelations = relations(EventTable, ({ many }) => ({
    bookings: many(BookingTable),
}));

export const scheduleRelations = relations(ScheduleTable, ({ many }) => ({
    availabilities: many(ScheduleAvailabilityTable),
}));

export const ScheduleAvailabilityRelations = relations(
    ScheduleAvailabilityTable,
    ({ one }) => ({
        schedule: one(ScheduleTable, {
            fields: [ScheduleAvailabilityTable.scheduleId],
            references: [ScheduleTable.id],
        }),
    })
);

export const BookingRelations = relations(BookingTable, ({ one }) => ({
    event: one(EventTable, {
        fields: [BookingTable.eventId],
        references: [EventTable.id],
    }),
}));
