<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Players and friendships (PostgreSQL).
 */
final class Version20261010091507 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Players and friendships for the online scoreboard';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE friendship (created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, player_id VARCHAR(16) NOT NULL, friend_id VARCHAR(16) NOT NULL, PRIMARY KEY (player_id, friend_id))');
        $this->addSql('CREATE INDEX IDX_7234A45F99E6F5DF ON friendship (player_id)');
        $this->addSql('CREATE INDEX IDX_7234A45F6A5458E8 ON friendship (friend_id)');
        $this->addSql('CREATE TABLE player (id VARCHAR(16) NOT NULL, name VARCHAR(16) NOT NULL, friend_code VARCHAR(6) NOT NULL, token_hash VARCHAR(64) NOT NULL, skin VARCHAR(40) NOT NULL, best_stage INT NOT NULL, best_level INT NOT NULL, best_distance BIGINT NOT NULL, scored_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_98197A65ED6FEC78 ON player (friend_code)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_98197A65B3BC57DA ON player (token_hash)');
        $this->addSql('CREATE INDEX player_rank_idx ON player (best_stage, best_distance)');
        $this->addSql('ALTER TABLE friendship ADD CONSTRAINT FK_7234A45F99E6F5DF FOREIGN KEY (player_id) REFERENCES player (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE friendship ADD CONSTRAINT FK_7234A45F6A5458E8 FOREIGN KEY (friend_id) REFERENCES player (id) ON DELETE CASCADE NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE friendship DROP CONSTRAINT FK_7234A45F99E6F5DF');
        $this->addSql('ALTER TABLE friendship DROP CONSTRAINT FK_7234A45F6A5458E8');
        $this->addSql('DROP TABLE friendship');
        $this->addSql('DROP TABLE player');
    }
}
