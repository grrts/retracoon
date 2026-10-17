<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Shared runs: the card and the few facts behind each public /r/{id} page.
 */
final class Version20261016110929 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Shared run pages';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE shared_run (id VARCHAR(10) NOT NULL, mode VARCHAR(8) NOT NULL, day VARCHAR(10) DEFAULT NULL, reason VARCHAR(8) NOT NULL, stage INT NOT NULL, area INT NOT NULL, level INT NOT NULL, theme VARCHAR(40) NOT NULL, theme_name VARCHAR(40) NOT NULL, killer VARCHAR(48) DEFAULT NULL, killer_id VARCHAR(40) DEFAULT NULL, gear JSON NOT NULL, card BYTEA NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, player_id VARCHAR(16) NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_762B393499E6F5DF ON shared_run (player_id)');
        $this->addSql('ALTER TABLE shared_run ADD CONSTRAINT FK_762B393499E6F5DF FOREIGN KEY (player_id) REFERENCES player (id) ON DELETE CASCADE NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE shared_run DROP CONSTRAINT FK_762B393499E6F5DF');
        $this->addSql('DROP TABLE shared_run');
    }
}
