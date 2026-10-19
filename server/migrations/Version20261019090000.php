<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Run tickets, the server-held banked raccoon, and run replays.
 */
final class Version20261019090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Run tickets, banked raccoon on the player, replays on run logs';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE run_ticket (id VARCHAR(20) NOT NULL, mode VARCHAR(8) NOT NULL, day VARCHAR(10) DEFAULT NULL, seed BIGINT NOT NULL, kept JSON DEFAULT NULL, based_on BIGINT DEFAULT NULL, status VARCHAR(10) NOT NULL, issued_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, closed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, player_id VARCHAR(16) NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX run_ticket_open_idx ON run_ticket (player_id, status)');
        $this->addSql('ALTER TABLE run_ticket ADD CONSTRAINT FK_RUN_TICKET_PLAYER FOREIGN KEY (player_id) REFERENCES player (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE player ADD kept JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE player ADD kept_set BOOLEAN DEFAULT false NOT NULL');
        $this->addSql('ALTER TABLE player ADD kept_from BIGINT DEFAULT NULL');
        $this->addSql("ALTER TABLE run_log ADD replay_status VARCHAR(12) DEFAULT 'none' NOT NULL");
        $this->addSql('ALTER TABLE run_log ADD replay JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE run_log ADD start JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE run_log ADD run_end VARCHAR(8) DEFAULT NULL');
        $this->addSql('ALTER TABLE run_log ADD based_on BIGINT DEFAULT NULL');
        $this->addSql('CREATE INDEX run_log_replay_idx ON run_log (replay_status, created_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX run_log_replay_idx');
        $this->addSql('ALTER TABLE run_log DROP replay_status');
        $this->addSql('ALTER TABLE run_log DROP replay');
        $this->addSql('ALTER TABLE run_log DROP start');
        $this->addSql('ALTER TABLE run_log DROP run_end');
        $this->addSql('ALTER TABLE run_log DROP based_on');
        $this->addSql('ALTER TABLE player DROP kept');
        $this->addSql('ALTER TABLE player DROP kept_set');
        $this->addSql('ALTER TABLE player DROP kept_from');
        $this->addSql('ALTER TABLE run_ticket DROP CONSTRAINT FK_RUN_TICKET_PLAYER');
        $this->addSql('DROP TABLE run_ticket');
    }
}
