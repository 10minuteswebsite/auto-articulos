-- REVERSA: restaura exactamente los valores del respaldo y luego puedes borrarlo manualmente.
BEGIN;
UPDATE "User" u SET "disabledModules"=b."disabledModules", "allowInstagramPublishing"=b."allowInstagramPublishing", "allowLinkedInPublishing"=b."allowLinkedInPublishing", "allowThreadsPublishing"=b."allowThreadsPublishing", "allowFacebookPublishing"=b."allowFacebookPublishing", "allowPinterestPublishing"=b."allowPinterestPublishing", "allowTumblrPublishing"=b."allowTumblrPublishing", "allowBlueskyPublishing"=b."allowBlueskyPublishing", "allowDevToPublishing"=b."allowDevToPublishing", "allowBloggerPublishing"=b."allowBloggerPublishing", "allowGoogleBusinessPublishing"=b."allowGoogleBusinessPublishing" FROM "_dia_cero_redes_respaldo" b WHERE b."id"=u."id";
COMMIT;
