-- Every shopper starts with a list named "<first name>'s list". New accounts get theirs when
-- they register; this gives one to the shoppers who already exist and are not in any list.
-- Shoppers who are already in at least one list (their own or a shared one) are left alone.
DO $$
DECLARE
  shopper RECORD;
  first_name TEXT;
  new_list_id UUID;
  attempt INT;
BEGIN
  FOR shopper IN
    SELECT u.id, u.full_name
      FROM users u
     WHERE u.role = 'CUSTOMER'
       AND NOT EXISTS (
         SELECT 1 FROM household_list_members m WHERE m.user_id = u.id
       )
  LOOP
    first_name := left(regexp_replace(btrim(COALESCE(shopper.full_name, '')), '\s.*$', ''), 80);
    new_list_id := NULL;

    -- Invite codes are unique; on the (very unlikely) clash, try another.
    FOR attempt IN 1..5 LOOP
      BEGIN
        INSERT INTO household_lists (name, invite_code)
        VALUES (
          CASE WHEN first_name = '' THEN 'My list' ELSE first_name || '''s list' END,
          upper(substr(md5(gen_random_uuid()::text), 1, 8))
        )
        RETURNING id INTO new_list_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        new_list_id := NULL;
      END;
    END LOOP;

    IF new_list_id IS NOT NULL THEN
      INSERT INTO household_list_members (list_id, user_id, role)
      VALUES (new_list_id, shopper.id, 'OWNER');
    END IF;
  END LOOP;
END $$;
