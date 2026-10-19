<?php

namespace App\Command;

use App\Repository\PlayerRepository;
use App\Repository\RunLogRepository;
use App\Service\RunAudit;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * A look at runs that didn't add up, and a way to keep a cheater off the boards.
 *
 *   bin/console app:runs                    newest suspect and rejected runs
 *   bin/console app:runs --player ID        one player's kept runs
 *   bin/console app:runs --hide ID          keep a player off every board and out of prizes
 *   bin/console app:runs --unhide ID
 */
#[AsCommand(name: 'app:runs', description: 'List suspect and rejected runs, or hide a player from the boards')]
final class RunsCommand extends Command
{
    public function __construct(private readonly RunLogRepository $runs, private readonly PlayerRepository $players, private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('player', null, InputOption::VALUE_REQUIRED, 'Show this player\'s kept runs')
            ->addOption('hide', null, InputOption::VALUE_REQUIRED, 'Hide this player from every board and from prizes')
            ->addOption('unhide', null, InputOption::VALUE_REQUIRED, 'Show this player again')
            ->addOption('limit', null, InputOption::VALUE_REQUIRED, 'How many runs', '30');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        foreach (['hide' => true, 'unhide' => false] as $opt => $hidden) {
            if (null !== ($id = $input->getOption($opt))) {
                $p = $this->players->find($id);
                if (!$p) {
                    $io->error("No player $id.");

                    return Command::FAILURE;
                }
                $p->setHidden($hidden);
                $this->em->flush();
                $io->success(\sprintf('%s#%d is %s.', $p->getName(), $p->getTag(), $hidden ? 'hidden from the boards' : 'on the boards again'));

                return Command::SUCCESS;
            }
        }
        $limit = max(1, (int) $input->getOption('limit'));
        if (null !== ($id = $input->getOption('player'))) {
            $p = $this->players->find($id);
            if (!$p) {
                $io->error("No player $id.");

                return Command::FAILURE;
            }
            $io->writeln(\sprintf('%s#%d, best stage %d%s', $p->getName(), $p->getTag(), $p->getBestStage(), $p->isHidden() ? ', HIDDEN' : ''));
            $list = $this->runs->forPlayer($p, $limit);
        } else {
            $list = $this->runs->flagged($limit);
        }
        $rows = [];
        foreach ($list as $r) {
            $rows[] = [
                $r->getCreatedAt()->format('Y-m-d H:i'),
                $r->getPlayer()->getId(),
                $r->getPlayer()->getName().'#'.$r->getPlayer()->getTag().($r->getPlayer()->isHidden() ? ' (hidden)' : ''),
                $r->getMode().($r->getDay() ? ' '.$r->getDay() : ''),
                $r->getStage(),
                $r->getLevel(),
                gmdate('H:i:s', intdiv($r->getTimeMs(), 1000)),
                $r->getVerdict().(RunAudit::OK === $r->getVerdict() || !$r->getReasons() ? '' : ': '.implode(', ', $r->getReasons())),
                null === $r->getLog() ? 'no' : \count(array_filter($r->getLog()['e'] ?? [], fn ($e) => 'f' === ($e[0] ?? null))).' fights',
                $r->getReplayStatus(),
            ];
        }
        $io->table(['when', 'player id', 'player', 'mode', 'stage', 'level', 'time', 'verdict', 'ledger', 'replay'], $rows);

        return Command::SUCCESS;
    }
}
