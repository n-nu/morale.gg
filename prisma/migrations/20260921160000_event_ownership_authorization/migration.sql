ALTER TABLE "Event" ADD COLUMN "ownerUserId" TEXT;

DO $$
DECLARE
    event_count BIGINT;
    backfill_user_id TEXT;
BEGIN
    SELECT COUNT(*) INTO event_count FROM "Event";

    IF event_count > 0 THEN
        backfill_user_id := NULLIF(
            current_setting('morale.event_owner_user_id', true),
            ''
        );

        IF backfill_user_id IS NULL THEN
            RAISE EXCEPTION 'Set morale.event_owner_user_id to the designated existing development User before migrating legacy Events';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = backfill_user_id) THEN
            RAISE EXCEPTION 'The designated Event owner must be an existing Auth.js User';
        END IF;

        UPDATE "Event" SET "ownerUserId" = backfill_user_id;
    END IF;

    IF EXISTS (SELECT 1 FROM "Event" WHERE "ownerUserId" IS NULL) THEN
        RAISE EXCEPTION 'Cannot require Event ownership while ownerless Events remain';
    END IF;
END $$;

ALTER TABLE "Event" ALTER COLUMN "ownerUserId" SET NOT NULL;

CREATE INDEX "Event_ownerUserId_idx" ON "Event"("ownerUserId");

ALTER TABLE "Event"
    ADD CONSTRAINT "Event_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "EventAuthorizedUser" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAuthorizedUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventAuthorizedUser_eventId_userId_key"
    ON "EventAuthorizedUser"("eventId", "userId");

CREATE INDEX "EventAuthorizedUser_userId_idx"
    ON "EventAuthorizedUser"("userId");

CREATE INDEX "EventAuthorizedUser_addedByUserId_idx"
    ON "EventAuthorizedUser"("addedByUserId");

ALTER TABLE "EventAuthorizedUser"
    ADD CONSTRAINT "EventAuthorizedUser_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventAuthorizedUser"
    ADD CONSTRAINT "EventAuthorizedUser_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventAuthorizedUser"
    ADD CONSTRAINT "EventAuthorizedUser_addedByUserId_fkey"
    FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "prevent_event_owner_authorization"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Event"
        WHERE "id" = NEW."eventId" AND "ownerUserId" = NEW."userId"
    ) THEN
        RAISE EXCEPTION 'An Event owner cannot also be an explicitly authorized User';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "EventAuthorizedUser_owner_exclusion_trigger"
BEFORE INSERT OR UPDATE OF "eventId", "userId"
ON "EventAuthorizedUser"
FOR EACH ROW EXECUTE FUNCTION "prevent_event_owner_authorization"();