<?php

namespace App\Command;

use App\Service\Prizes;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Pays daily and season winners. The API also does this on its own when boards are
 * read; run this from cron (e.g. every 15 minutes) so prizes land even on a quiet day.
 */
#[AsCommand(name: 'app:prizes', description: 'Pay the winners of closed daily and season boards')]
final class PrizesCommand extends Command
{
    public function __construct(private readonly Prizes $prizes)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln(\sprintf('Paid %d prize(s).', $this->prizes->settle()));

        return Command::SUCCESS;
    }
}
