<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Accounts (PostgreSQL): players belong to a Google, Apple or Steam account, names get
 * a 4-digit tag, each device gets its own sign-in token, and purchases are recorded.
 *
 * Players registered before this (no account) keep their scoreboard rows as 'legacy'
 * players. They can't be signed in to.
 */
final class Version20261010160000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Account sign-in, name tags, sessions and purchases';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE player ADD tag SMALLINT DEFAULT NULL');
        $this->addSql('ALTER TABLE player ADD provider VARCHAR(10) DEFAULT NULL');
        $this->addSql('ALTER TABLE player ADD provider_id VARCHAR(100) DEFAULT NULL');
        $this->addSql('ALTER TABLE player ADD gems INT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE player ADD no_ads BOOLEAN DEFAULT false NOT NULL');
        $this->addSql("ALTER TABLE player ADD unlocks JSON DEFAULT '[]' NOT NULL");
        $this->addSql('ALTER TABLE player ADD apple_refresh_token TEXT DEFAULT NULL');
        $this->addSql('UPDATE player p SET tag = 999 + n.rn FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) AS rn FROM player) n WHERE p.id = n.id');
        $this->addSql("UPDATE player SET provider = 'legacy', provider_id = id");
        $this->addSql('ALTER TABLE player ALTER tag SET NOT NULL');
        $this->addSql('ALTER TABLE player ALTER provider SET NOT NULL');
        $this->addSql('ALTER TABLE player ALTER provider_id SET NOT NULL');
        $this->addSql('ALTER TABLE player ALTER gems DROP DEFAULT');
        $this->addSql('ALTER TABLE player ALTER no_ads DROP DEFAULT');
        $this->addSql('ALTER TABLE player ALTER unlocks DROP DEFAULT');
        $this->addSql('DROP INDEX UNIQ_98197A65B3BC57DA');
        $this->addSql('ALTER TABLE player DROP token_hash');
        $this->addSql('CREATE UNIQUE INDEX player_name_tag ON player (name, tag)');
        $this->addSql('CREATE UNIQUE INDEX player_account ON player (provider, provider_id)');

        $this->addSql('CREATE TABLE session (token_hash VARCHAR(64) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, player_id VARCHAR(16) NOT NULL, PRIMARY KEY (token_hash))');
        $this->addSql('CREATE INDEX IDX_D044D5D499E6F5DF ON session (player_id)');
        $this->addSql('ALTER TABLE session ADD CONSTRAINT FK_D044D5D499E6F5DF FOREIGN KEY (player_id) REFERENCES player (id) ON DELETE CASCADE NOT DEFERRABLE');

        $this->addSql('CREATE TABLE purchase (transaction_id VARCHAR(120) NOT NULL, product_id VARCHAR(60) NOT NULL, gems INT NOT NULL, refunded BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, player_id VARCHAR(16) NOT NULL, PRIMARY KEY (transaction_id))');
        $this->addSql('CREATE INDEX IDX_6117D13B99E6F5DF ON purchase (player_id)');
        $this->addSql('ALTER TABLE purchase ADD CONSTRAINT FK_6117D13B99E6F5DF FOREIGN KEY (player_id) REFERENCES player (id) ON DELETE CASCADE NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE purchase');
        $this->addSql('DROP TABLE session');
        $this->addSql('DROP INDEX player_name_tag');
        $this->addSql('DROP INDEX player_account');
        // Old anonymous tokens are gone; players have to register again.
        $this->addSql("ALTER TABLE player ADD token_hash VARCHAR(64) DEFAULT NULL");
        $this->addSql('UPDATE player SET token_hash = md5(id) || md5(random()::text)');
        $this->addSql('ALTER TABLE player ALTER token_hash SET NOT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_98197A65B3BC57DA ON player (token_hash)');
        $this->addSql('ALTER TABLE player DROP tag, DROP provider, DROP provider_id, DROP gems, DROP no_ads, DROP unlocks, DROP apple_refresh_token');
    }
}
