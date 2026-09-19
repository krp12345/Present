INSERT INTO tags (name)
SELECT v
FROM (
  VALUES
    ('morning'),
    ('evening'),
    ('work'),
    ('personal'),
    ('exercise'),
    ('family'),
    ('reading'),
    ('health'),
    ('food'),
    ('travel'),
    ('friends'),
    ('learning'),
    ('creative'),
    ('outdoors'),
    ('rest'),
    ('chores'),
    ('shopping'),
    ('music'),
    ('meditation'),
    ('social'),
    ('commute'),
    ('meeting'),
    ('project'),
    ('weekend'),
    ('errands')
) AS t(v)
ON CONFLICT (name) DO NOTHING;
